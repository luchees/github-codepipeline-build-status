import * as cdk from "@aws-cdk/core";
import * as sns from "@aws-cdk/aws-sns";
import * as lambda from "@aws-cdk/aws-lambda";
import * as iam from "@aws-cdk/aws-iam";
import * as codestarnotifications from "@aws-cdk/aws-codestarnotifications";
import * as codePipeline from "@aws-cdk/aws-codepipeline";
import { inlineCode } from "./lambdaCode";

export interface GithubStatusProps {
  codePipeline: codePipeline.Pipeline;
  ssmGithubAuth: string;
}

export class GithubStatus extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: GithubStatusProps) {
    super(scope, id);

    const fn = new lambda.Function(this, "GithubCheckLambda", {
      runtime: lambda.Runtime.PYTHON_3_8,
      handler: "index.lambda_handler",
      code: lambda.Code.fromInline(inlineCode),
      environment: {
        BASIC_AUTH_SSM_PARAM: props.ssmGithubAuth,
      },
    });

    fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["codepipeline:GetPipelineExecution"],
        resources: [props.codePipeline.pipelineArn],
      })
    );
    fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameter"],
        resources: [`arn:aws:ssm:*:*:parameter${props.ssmGithubAuth}`],
      })
    );

    const topic = new sns.Topic(this, "NotificationTopic", {
      displayName: `${props.codePipeline.pipelineName}GithubCheckTopic`,
    });
    topic.addToResourcePolicy(
      new iam.PolicyStatement({
        principals: [
          new iam.ServicePrincipal("codestar-notifications.amazonaws.com"),
        ],
        actions: ["sns:Publish"],
        resources: [topic.topicArn],
      })
    );
    new sns.Subscription(this, "GithubLambdaSubscription", {
      endpoint: fn.functionArn,
      protocol: sns.SubscriptionProtocol.LAMBDA,
      topic,
    });
    fn.addPermission("SnsInvoke", {
      action: "lambda:InvokeFunction",
      principal: new iam.ServicePrincipal("sns.amazonaws.com"),
      sourceArn: topic.topicArn,
    });
    new codestarnotifications.NotificationRule(this, "GithubNotificationRule", {
      detailType: codestarnotifications.DetailType.FULL,
      events: [
        "codepipeline-pipeline-pipeline-execution-failed",
        "codepipeline-pipeline-pipeline-execution-canceled",
        "codepipeline-pipeline-pipeline-execution-started",
        "codepipeline-pipeline-pipeline-execution-resumed",
        "codepipeline-pipeline-pipeline-execution-succeeded",
        "codepipeline-pipeline-pipeline-execution-superseded",
      ],
      source: props.codePipeline,
      targets: [topic],
    });
  }
}
