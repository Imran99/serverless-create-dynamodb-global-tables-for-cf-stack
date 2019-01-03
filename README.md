# Serverless Create DynamoDB Global Tables For CF Stack

A Serverless plugin that will add a global table and replica region for all tables deployed in a serverless stack.

DynamoDB currently imposes some strict limitations when [creating global tables](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/globaltables_reqs_bestpractices.html):
- The table provisioning settings must match for each regional table
- The table names must match
- Streams must be enabled
- All tables must be empty
- If a replica table is removed from a global table it can not be readded. You can however drop the table and recreate it to add it to global replication.

The plugin handles these limitation by enabling global replication for all tables defined in the serverless stack and thus tying the global tables lifecycle to the table resources defined in the stack. Adding and removing tables from the stack will add and remove them from replication.

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