# github-codepipeline-build-status-construct

AWS CodePipeline build status integration with GitHub repository Typescript Construct for CDK
This CDK Construct is based on https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/use-third-party-git-source-repositories-in-aws-codepipeline.html

You will need to have or configure an existing AWS CodePipeline pipeline setup with source provider GitHub and have access to GitHub account to generate API credentials.
The value of the parameter in ssm should be a `SecretString` and like: `userName:ghp_fR78NFvSf216541fGtcmfdsOnlfsafddw1K`

```Typescript
    const pipeline = new CdkPipeline(this, 'CdkPipeline', {
        ...
    })
    new GithubStatus(this, 'GithubStatus', {
        codePipeline: pipeline.codePipeline,
        githubAuthSsm: `/brikl-shop/${props.stage}/GITHUB_BASIC_AUTH` // `userName:ghp_fR78NFvSf216541fGtcmfdsOnlfsafddw1K`
    })
```
