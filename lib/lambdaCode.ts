export const inlineCode: string = `
from __future__ import print_function
import json
import boto3
import os
import urllib3
from base64 import b64encode
codepipeline_client = boto3.client('codepipeline')
ssm = boto3.client('ssm')
auth_ssm_param = os.environ['BASIC_AUTH_SSM_PARAM']
user_pass=0
if user_pass == 0:
    parameter = ssm.get_parameter(Name=auth_ssm_param, WithDecryption=True)
    user_pass=parameter['Parameter']['Value']
region = os.environ['AWS_REGION']
def lambda_handler(event, context):
    message = event['Records'][0]['Sns']['Message']
    data = json.loads(message)
    print (data)
    if data.get("detailType") != "CodePipeline Pipeline Execution State Change":
        return()
    response = codepipeline_client.get_pipeline_execution(
        pipelineName=data['detail']['pipeline'],
        pipelineExecutionId=data['detail']['execution-id']
    )
    print(response)
    short_commit_od = response['pipelineExecution']['artifactRevisions'][0]['revisionId'][0:7]
    commit_id = response['pipelineExecution']['artifactRevisions'][0]['revisionId']
    revision_url = response['pipelineExecution']['artifactRevisions'][0]['revisionUrl']
    if "FullRepositoryId=" in revision_url:
        repo_id = revision_url.split("FullRepositoryId=")[1].split("&")[0]
    else: #gitbub v1 integration
        repo_id = revision_url.split("/")[3] + "/" + revisionUrl.split("/")[4]
    #Based on https://docs.github.com/en/free-pro-team@latest/rest/reference/repos#statuses
    if data['detail']['state'].upper() in [ "SUCCEEDED" ]:
        state = "success"
    elif data['detail']['state'].upper() in [ "STARTED", "STOPPING", "STOPPED", "SUPERSEDED" ]:
        state = "pending"
    else:
        state = "error"
    url = "https://api.github.com/repos/" + repo_id + "/statuses/" + commit_id
    build_status={}
    build_status['state'] = state
    build_status['context'] = data['detail']['pipeline']
    build_status['description'] = data['detail']['pipeline']
    build_status['target_url'] = "https://" + region + ".console.aws.amazon.com/codesuite/codepipeline/pipelines/" + data['detail']['pipeline'] + "/executions/" + data['detail']['execution-id'] + "?region="+region
    encode_user_pass = b64encode(user_pass.encode()).decode()
    http = urllib3.PoolManager()
    r = http.request('POST', url,
    headers={'Accept': 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'Curl/0.1', 'Authorization' : 'Basic %s' %  encode_user_pass},
    body=json.dumps(build_status).encode('utf-8')
    )
    print(r.data)
    return message
`;
