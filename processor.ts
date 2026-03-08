import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import { S3Event } from "aws-lambda";

// Initialize AWS Clients
const s3 = new S3Client({ region: process.env.AWS_REGION });
const textract = new TextractClient({ region: process.env.AWS_REGION });
const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
const polly = new PollyClient({ region: process.env.AWS_REGION });

const OUTPUT_BUCKET = process.env.OUTPUT_BUCKET!;

export const handler = async (event: S3Event): Promise<any> => {
    try {
        // 1. Get the uploaded image from S3
        const bucket = event.Records[0].s3.bucket.name;
        const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
        
        console.log(`Processing document: ${key} from bucket: ${bucket}`);

        // 2. Extract Text using Amazon Textract (Requirement 2)
        const textractResponse = await textract.send(new DetectDocumentTextCommand({
            Document: { S3Object: { Bucket: bucket, Name: key } }
        }));

        const extractedText = textractResponse.Blocks?.filter(block => block.BlockType === 'LINE')
                                             .map(block => block.Text)
                                             .join('\n') || '';
        
        if (!extractedText) throw new Error("No text could be extracted from the document.");

        // 3. Summarize & Simplify using Bedrock / Claude 3.5 Sonnet (Requirement 4)
        // We prompt Claude to return a structured JSON to power the 'Chitra' (Comic) UI
        const prompt = `
        You are Vani-Chitra, an AI that simplifies complex documents for rural Indian users.
        Read the following document text and simplify it to a 5th-grade reading level.
        Return ONLY a JSON object with this exact structure:
        {
            "simplifiedText": "A continuous story summarizing the document in plain Hindi.",
            "keyPoints": ["Point 1", "Point 2"],
            "visualScenes": [
                "Prompt for panel 1 (e.g., A farmer looking at a paper)",
                "Prompt for panel 2",
                "Prompt for panel 3"
            ]
        }
        Document Text: ${extractedText}
        `;

        const bedrockPayload = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 1000,
            messages: [{ role: "user", content: prompt }]
        };

        const bedrockResponse = await bedrock.send(new InvokeModelCommand({
            modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0", // Claude 3.5 Sonnet
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(bedrockPayload)
        }));

        const responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
        const claudeOutput = JSON.parse(responseBody.content[0].text);

        // 4. Generate Audio using Amazon Polly (Requirement 6)
        // Using 'Aditi' for Hindi/Indian English support
        const pollyResponse = await polly.send(new SynthesizeSpeechCommand({
            Text: claudeOutput.simplifiedText,
            OutputFormat: "mp3",
            VoiceId: "Aditi", 
            Engine: "neural"
        }));

        // 5. Save the outputs back to S3
        const baseKey = key.split('.')[0];
        const audioKey = `processed/${baseKey}/audio.mp3`;
        const dataKey = `processed/${baseKey}/data.json`;

        // Save Audio
        if (pollyResponse.AudioStream) {
            const audioBuffer = await pollyResponse.AudioStream.transformToByteArray();
            await s3.send(new PutObjectCommand({
                Bucket: OUTPUT_BUCKET,
                Key: audioKey,
                Body: audioBuffer,
                ContentType: "audio/mpeg"
            }));
        }

        // Save JSON Data (Summary + Visual Prompts)
        await s3.send(new PutObjectCommand({
            Bucket: OUTPUT_BUCKET,
            Key: dataKey,
            Body: JSON.stringify(claudeOutput),
            ContentType: "application/json"
        }));

        console.log(`Successfully processed ${key}. Outputs saved to ${OUTPUT_BUCKET}/processed/${baseKey}/`);
        
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Document processed successfully", documentId: baseKey })
        };

    } catch (error) {
        console.error("Error processing document:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Processing failed. Please try again." })
        };
    }
};