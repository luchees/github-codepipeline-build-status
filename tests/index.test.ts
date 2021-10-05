import { GithubStatus } from "../lib/index";
import { App, Stack, SecretValue } from "@aws-cdk/core";
import { CdkPipeline, SimpleSynthAction } from "@aws-cdk/pipelines";
import {
  GitHubSourceAction,
  JenkinsAction,
  LambdaInvokeAction,
} from "@aws-cdk/aws-codepipeline-actions";
import * as codepipeline from "@aws-cdk/aws-codepipeline";
import "@aws-cdk/assert/jest";
import { Code, Function, Runtime } from "@aws-cdk/aws-lambda";
import { Artifact } from "@aws-cdk/aws-codepipeline";

test("Has one Lambda function with Python Runtime", () => {
  const mockApp = new App();
  const stack = new Stack(mockApp, "testing-stack");
  const pipeline = new codepipeline.Pipeline(stack, "testPipeline");
  pipeline.addStage({
    stageName: "testStage",
    actions: [
      new GitHubSourceAction({
        actionName: "test",
        oauthToken: SecretValue.plainText("test"),
        output: new Artifact(),
        owner: "test",
        repo: "test",
      }),
    ],
  });
  pipeline.addStage({
    stageName: "testStage2",
    actions: [
      new LambdaInvokeAction({
        actionName: "test",
        lambda: new Function(stack, "testLambda2", {
          code: Code.fromInline("test"),
          handler: "index.handler",
          runtime: Runtime.NODEJS_10_X,
        }),
      }),
    ],
  });
  new GithubStatus(stack, "testing", {
    codePipeline: pipeline,
    ssmGithubAuth: "/param/to/githubAuth",
  });

  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Runtime: "python3.8",
  });
});
