"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
var client_s3_1 = require("@aws-sdk/client-s3");
var client_textract_1 = require("@aws-sdk/client-textract");
var client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
var client_polly_1 = require("@aws-sdk/client-polly");
// Initialize AWS Clients
var s3 = new client_s3_1.S3Client({ region: process.env.AWS_REGION });
var textract = new client_textract_1.TextractClient({ region: process.env.AWS_REGION });
var bedrock = new client_bedrock_runtime_1.BedrockRuntimeClient({ region: process.env.AWS_REGION });
var polly = new client_polly_1.PollyClient({ region: process.env.AWS_REGION });
var OUTPUT_BUCKET = process.env.OUTPUT_BUCKET;
var handler = function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var bucket, key, textractResponse, extractedText, prompt_1, bedrockPayload, bedrockResponse, responseBody, claudeOutput, pollyResponse, baseKey, audioKey, dataKey, audioBuffer, error_1;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 8, , 9]);
                bucket = event.Records[0].s3.bucket.name;
                key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
                console.log("Processing document: ".concat(key, " from bucket: ").concat(bucket));
                return [4 /*yield*/, textract.send(new client_textract_1.DetectDocumentTextCommand({
                        Document: { S3Object: { Bucket: bucket, Name: key } }
                    }))];
            case 1:
                textractResponse = _b.sent();
                extractedText = ((_a = textractResponse.Blocks) === null || _a === void 0 ? void 0 : _a.filter(function (block) { return block.BlockType === 'LINE'; }).map(function (block) { return block.Text; }).join('\n')) || '';
                if (!extractedText)
                    throw new Error("No text could be extracted from the document.");
                prompt_1 = "\n        You are Vani-Chitra, an AI that simplifies complex documents for rural Indian users.\n        Read the following document text and simplify it to a 5th-grade reading level.\n        Return ONLY a JSON object with this exact structure:\n        {\n            \"simplifiedText\": \"A continuous story summarizing the document in plain Hindi.\",\n            \"keyPoints\": [\"Point 1\", \"Point 2\"],\n            \"visualScenes\": [\n                \"Prompt for panel 1 (e.g., A farmer looking at a paper)\",\n                \"Prompt for panel 2\",\n                \"Prompt for panel 3\"\n            ]\n        }\n        Document Text: ".concat(extractedText, "\n        ");
                bedrockPayload = {
                    anthropic_version: "bedrock-2023-05-31",
                    max_tokens: 1000,
                    messages: [{ role: "user", content: prompt_1 }]
                };
                return [4 /*yield*/, bedrock.send(new client_bedrock_runtime_1.InvokeModelCommand({
                        modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0", // Claude 3.5 Sonnet
                        contentType: "application/json",
                        accept: "application/json",
                        body: JSON.stringify(bedrockPayload)
                    }))];
            case 2:
                bedrockResponse = _b.sent();
                responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
                claudeOutput = JSON.parse(responseBody.content[0].text);
                return [4 /*yield*/, polly.send(new client_polly_1.SynthesizeSpeechCommand({
                        Text: claudeOutput.simplifiedText,
                        OutputFormat: "mp3",
                        VoiceId: "Aditi",
                        Engine: "neural"
                    }))];
            case 3:
                pollyResponse = _b.sent();
                baseKey = key.split('.')[0];
                audioKey = "processed/".concat(baseKey, "/audio.mp3");
                dataKey = "processed/".concat(baseKey, "/data.json");
                if (!pollyResponse.AudioStream) return [3 /*break*/, 6];
                return [4 /*yield*/, pollyResponse.AudioStream.transformToByteArray()];
            case 4:
                audioBuffer = _b.sent();
                return [4 /*yield*/, s3.send(new client_s3_1.PutObjectCommand({
                        Bucket: OUTPUT_BUCKET,
                        Key: audioKey,
                        Body: audioBuffer,
                        ContentType: "audio/mpeg"
                    }))];
            case 5:
                _b.sent();
                _b.label = 6;
            case 6: 
            // Save JSON Data (Summary + Visual Prompts)
            return [4 /*yield*/, s3.send(new client_s3_1.PutObjectCommand({
                    Bucket: OUTPUT_BUCKET,
                    Key: dataKey,
                    Body: JSON.stringify(claudeOutput),
                    ContentType: "application/json"
                }))];
            case 7:
                // Save JSON Data (Summary + Visual Prompts)
                _b.sent();
                console.log("Successfully processed ".concat(key, ". Outputs saved to ").concat(OUTPUT_BUCKET, "/processed/").concat(baseKey, "/"));
                return [2 /*return*/, {
                        statusCode: 200,
                        body: JSON.stringify({ message: "Document processed successfully", documentId: baseKey })
                    }];
            case 8:
                error_1 = _b.sent();
                console.error("Error processing document:", error_1);
                return [2 /*return*/, {
                        statusCode: 500,
                        body: JSON.stringify({ error: "Processing failed. Please try again." })
                    }];
            case 9: return [2 /*return*/];
        }
    });
}); };
exports.handler = handler;
