const AWS = require('aws-sdk');
const _values = require('lodash.values');
const _get = require('lodash.get');
const chalk = require('chalk');

class CreateDynamoDBGlobalTables {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.hooks = {
      'after:deploy:deploy': this.createGlobalTables.bind(this),
    };
  }

  async createGlobalTables() {
    const enabled = _get(this.serverless, 'service.custom.dynamoDBGlobalTables.enabled', true);
    if(enabled == false) {
      this.log('Plugin disabled');
      return;
    }

    const provider = this.serverless.getProvider('aws');
    const region = provider.getRegion();
    const tableNames = this.getTableNames();

    await Promise.all(tableNames.map(t => this.createGlobalTable(t, region)));
    await Promise.all(tableNames.map(t => this.addReplica(t, region)));
  }

  getTableNames() {
    const tableNames = _values(this.serverless.service.resources.Resources)
      .filter(r => r.Type === 'AWS::DynamoDB::Table')
      .map(r => r.Properties.TableName);

    return tableNames;
  }

  async createGlobalTable(tableName, region) {
    const dynamo = new AWS.DynamoDB({ region });
    const params = {
      GlobalTableName: tableName,
      ReplicationGroup: [{ RegionName: region }]
    };

    try {
      await dynamo.createGlobalTable(params).promise();
      this.log(`Added Global Table ${tableName} with ${region} replica`);
    } catch (error) {
      if (error.code === 'GlobalTableAlreadyExistsException') {
        this.log(`Global table ${tableName} already exists`);
      } else {
        throw error;
      }
    }
  }

  async addReplica(tableName, region) {
    const dynamo = new AWS.DynamoDB({ region });
    const params = {
      GlobalTableName: tableName,
      ReplicaUpdates: [
        { Create: { RegionName: region } }
      ]
    };

    try {
      await dynamo.updateGlobalTable(params).promise();
      this.log(`Added Replica ${tableName} to ${region}`);
    } catch (error) {
      if (error.code === 'ReplicaAlreadyExistsException') {
        this.log(`Replica ${tableName} already exists in ${region}`);
      } else {
        throw error;
      }
    }
  }

  log(message) {
    this.serverless.cli.consoleLog(`DynamoDB Global Tables: ${chalk.yellow(message)}`);
  }
}

module.exports = CreateDynamoDBGlobalTables;