# Serverless Create DynamoDB Global Tables For CF Stack

A Serverless v1.x plugin that will add a global table and replica region for all tables deployed in a serverless stack.

DynamoDB currently imposes some strict limitations when [creating global tables](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/globaltables_reqs_bestpractices.html):
- The table provisioning settings must match for each regional table
- The table names must match
- Streams must be enabled
- All tables must be empty

The plugin handles these limitation by leaving table creation / deletion to your serverles stack resources and only adding and removing tables from a replication group as the corresponfing stack resource is added and removed in each region. All tables in the stack will be added to global replication.

## Install

```sh
$ npm install serverless-create-dynamodb-global-tables-for-cf-stack --save-dev
```

Add the plugin to your `serverless.yml` file:

```yml
plugins:
  - serverless-create-dynamodb-global-tables-for-cf-stack
```
 
## Usage

Simply deploy your stack to each region you wish to add to the replication group. Remove your stack from each region that you no longer want in replication.

```sh
serverless deploy --region us-east-1
serverless deploy --region eu-west-1
```

When you add/remove table resources from your serverless stack they will also be added/removed from global replication but you will need to redeploy your stack to each region.