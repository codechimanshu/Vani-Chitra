# Vani-Chitra Multimodal RAG Lambda Function

AWS Lambda function for generating 3-panel comic storyboards using Amazon Bedrock (Claude 3.5 Sonnet) with multimodal RAG workflow.

## Overview

This serverless function combines document images from S3 and transcribed voice input to generate accessible comic storyboards for rural Indian users with literacy barriers.

## Architecture

```
User Input (Image + Voice)
    ↓
S3 Storage
    ↓
Lambda Function
    ├── Get Image from S3
    ├── Process Transcribed Text
    ├── Invoke Bedrock (Claude 3.5 Sonnet)
    └── Generate 3-Panel Storyboard
    ↓
JSON Response
```

## Features

- **Multimodal Input**: Processes both document images and voice transcriptions
- **AWS-Native**: Uses Boto3 for S3 and Bedrock integration
- **Claude 3.5 Sonnet**: Leverages latest Anthropic model for multimodal understanding
- **Multi-Language Support**: Generates storyboards in 10 Indian regional languages
- **Serverless**: Fully serverless with automatic scaling
- **Error Handling**: Comprehensive error handling and logging

## Prerequisites

- AWS Account with access to:
  - Amazon S3
  - Amazon Bedrock (Claude 3.5 Sonnet model access)
  - AWS Lambda
  - Amazon CloudWatch Logs
- Python 3.11 runtime
- IAM role with appropriate permissions

## Deployment

### 1. Install Dependencies

```bash
pip install -r requirements.txt -t .
```

### 2. Create Deployment Package

```bash
zip -r lambda_function.zip lambda_function.py boto3 botocore
```

### 3. Deploy to AWS Lambda

Using AWS CLI:

```bash
aws lambda create-function \
  --function-name vani-chitra-multimodal-rag \
  --runtime python3.11 \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/vani-chitra-lambda-role \
  --handler lambda_function.lambda_handler \
  --zip-file fileb://lambda_function.zip \
  --timeout 60 \
  --memory-size 1024 \
  --environment Variables="{AWS_REGION=us-east-1}"
```

Or using AWS SAM/CloudFormation (see `lambda_config.yaml`)

### 4. Configure IAM Permissions

Attach the following policies to your Lambda execution role:

- S3 read access for document images
- Bedrock InvokeModel permission for Claude 3.5 Sonnet
- CloudWatch Logs for logging

## Usage

### Input Event Format

```json
{
  "image_s3_uri": "s3://bucket-name/path/to/document.jpg",
  "transcribed_text": "User's voice query transcribed by Amazon Transcribe",
  "target_language": "hi"
}
```

### Supported Languages

- `hi` - Hindi
- `mr` - Marathi
- `ta` - Tamil
- `te` - Telugu
- `bn` - Bengali
- `gu` - Gujarati
- `kn` - Kannada
- `ml` - Malayalam
- `pa` - Punjabi
- `en` - English

### Output Format

```json
{
  "statusCode": 200,
  "body": {
    "success": true,
    "storyboard": {
      "panel_1": {
        "title": "Introduction",
        "description": "...",
        "visual_elements": "...",
        "caption": "..."
      },
      "panel_2": {
        "title": "Key Information",
        "description": "...",
        "visual_elements": "...",
        "caption": "..."
      },
      "panel_3": {
        "title": "Action Required",
        "description": "...",
        "visual_elements": "...",
        "caption": "..."
      },
      "summary": "Overall summary in target language"
    },
    "metadata": {
      "image_uri": "s3://...",
      "target_language": "hi",
      "model": "anthropic.claude-3-5-sonnet-20241022-v2:0"
    }
  }
}
```

## Testing

### Local Testing

```bash
python -c "
import json
from lambda_function import lambda_handler

with open('test_event.json') as f:
    event = json.load(f)

result = lambda_handler(event, None)
print(json.dumps(result, indent=2))
"
```

### AWS Console Testing

1. Go to AWS Lambda Console
2. Select the function
3. Click "Test" tab
4. Use the event from `test_event.json`
5. Click "Test" button

## Integration with Step Functions

This Lambda function can be orchestrated using AWS Step Functions for complex workflows:

```json
{
  "Comment": "Vani-Chitra Multimodal RAG Workflow",
  "StartAt": "TranscribeVoice",
  "States": {
    "TranscribeVoice": {
      "Type": "Task",
      "Resource": "arn:aws:states:::aws-sdk:transcribe:startTranscriptionJob",
      "Next": "GenerateStoryboard"
    },
    "GenerateStoryboard": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:REGION:ACCOUNT:function:vani-chitra-multimodal-rag",
      "End": true
    }
  }
}
```

## Monitoring

### CloudWatch Metrics

- Invocations
- Duration
- Errors
- Throttles

### CloudWatch Logs

All function logs are sent to CloudWatch Logs group:
`/aws/lambda/vani-chitra-multimodal-rag`

### Custom Metrics

Add custom metrics using CloudWatch Embedded Metric Format (EMF):

```python
print(json.dumps({
    "_aws": {
        "Timestamp": int(time.time() * 1000),
        "CloudWatchMetrics": [{
            "Namespace": "VaniChitra",
            "Dimensions": [["Language"]],
            "Metrics": [{"Name": "StoryboardGenerated", "Unit": "Count"}]
        }]
    },
    "Language": target_language,
    "StoryboardGenerated": 1
}))
```

## Cost Optimization

- **Memory**: Adjust based on actual usage (current: 1024 MB)
- **Timeout**: Set to 60 seconds (typical execution: 10-20 seconds)
- **Reserved Concurrency**: Limit to prevent runaway costs
- **S3 Lifecycle**: Auto-delete temporary files after 24 hours

## Security Best Practices

1. **Least Privilege IAM**: Grant only necessary permissions
2. **Encryption**: Enable encryption at rest for S3 buckets
3. **VPC**: Deploy in VPC for private resource access (optional)
4. **Secrets**: Use AWS Secrets Manager for sensitive data
5. **Input Validation**: Validate all inputs before processing

## Troubleshooting

### Common Issues

**Error: "Invalid S3 URI format"**
- Ensure URI starts with `s3://`
- Check bucket name and object key are correct

**Error: "Access Denied"**
- Verify IAM role has S3 GetObject permission
- Check Bedrock model access is enabled

**Error: "Model not found"**
- Ensure Claude 3.5 Sonnet is available in your region
- Request model access in Bedrock console if needed

**Timeout**
- Increase Lambda timeout (max 15 minutes)
- Optimize image size before upload
- Check network connectivity to Bedrock

## Performance

- **Cold Start**: ~2-3 seconds
- **Warm Execution**: ~10-20 seconds
- **Image Processing**: ~2-5 seconds
- **Bedrock Invocation**: ~5-15 seconds

## Future Enhancements

- [ ] Add image compression before Bedrock invocation
- [ ] Implement caching for repeated queries
- [ ] Add support for multi-page documents
- [ ] Generate actual comic images (not just descriptions)
- [ ] Add A/B testing for prompt variations
- [ ] Implement feedback loop for model improvement

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:
- GitHub Issues: [repository-url]
- Email: team@royalbeast.dev
- Hackathon: AI for Bharat 2026
