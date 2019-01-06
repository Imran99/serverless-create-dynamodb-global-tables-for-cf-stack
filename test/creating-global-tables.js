'use strict';

const CreateDynamoDBGlobalTables = require('../src/index.js');
const AWSMock = require('aws-sdk-mock');
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var chaiAsPromised = require('chai-as-promised');
chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

let serverless, plugin, createGlobalTables, addReplicas;

describe('Creating a global dynamodb tables', () => {

  describe('when the stack does not contain any dynamodb tables', () => {

    before(async () => {
      given_aws_dynamodb_is_mocked();
      serverless = given_a_serverless_stack_without_any_tables();
      plugin = new CreateDynamoDBGlobalTables(serverless);
      await plugin.createGlobalTables();
    });

    after(() => {
      AWSMock.restore();
    });

    it('does not create any global tables', () => {
      createGlobalTables.should.not.have.been.called;
    });

    it('does not add any replicas', () => {
      addReplicas.should.not.have.been.called;
    });
  });

  describe('when the stack contains dynamodb tables that have not yet been deployed', () => {

    before(async () => {
      given_aws_dynamodb_is_mocked();
      serverless = given_a_serverless_stack_with_some_tables();
      plugin = new CreateDynamoDBGlobalTables(serverless);
      await plugin.createGlobalTables();
    });

    after(() => {
      AWSMock.restore();
    });

    it('creates a global table for all table resource', () => {
      createGlobalTables.should.have.been.calledTwice;
    });

    it('the first global table is created with a replication region', () => {
      createGlobalTables.should.have.been.calledWith({
        GlobalTableName: 'table-one',
        ReplicationGroup: [{ RegionName: 'eu-west-2' }]
      });
    });

    it('the second global table is created with a replication region', () => {
      createGlobalTables.should.have.been.calledWith({
        GlobalTableName: 'table-two',
        ReplicationGroup: [{ RegionName: 'eu-west-2' }]
      });
    });
  });

  describe('when the dynamodb global table already exists', () => {

    before(async () => {
      given_aws_dynamodb_is_mocked();
      createGlobalTables.rejects({ code: 'GlobalTableAlreadyExistsException' });
      serverless = given_a_serverless_stack_with_some_tables();
      plugin = new CreateDynamoDBGlobalTables(serverless);
      await plugin.createGlobalTables();
    });

    after(() => {
      AWSMock.restore();
    });

    it('adds a replica table for all table resource', () => {
      addReplicas.should.have.been.calledTwice;
    });

    it('adds the first table replica to the existing global table', () => {
      addReplicas.should.have.been.calledWith({
        GlobalTableName: 'table-one',
        ReplicaUpdates: [
          { Create: { RegionName: 'eu-west-2' } }
        ]
      });
    });

    it('adds the second table replica to the existing global table', () => {
      addReplicas.should.have.been.calledWith({
        GlobalTableName: 'table-one',
        ReplicaUpdates: [
          { Create: { RegionName: 'eu-west-2' } }
        ]
      });
    });
  });

  describe('when the replication group already exists', () => {

    before(async () => {
      given_aws_dynamodb_is_mocked();
      addReplicas.rejects({ code: 'ReplicaAlreadyExistsException' });
      serverless = given_a_serverless_stack_with_some_tables();
      plugin = new CreateDynamoDBGlobalTables(serverless);
      await plugin.createGlobalTables();
    });

    after(() => {
      AWSMock.restore();
    });

    it('attempts to add a replica table for all table resource', () => {
      addReplicas.should.have.been.calledTwice;
    });
  });

  describe('when an exception occurs creating the global table', () => {

    before(async () => {
      given_aws_dynamodb_is_mocked();
      createGlobalTables.rejects({ code: 'UnhandledException' });
      serverless = given_a_serverless_stack_with_some_tables();
      plugin = new CreateDynamoDBGlobalTables(serverless);
    });

    after(() => {
      AWSMock.restore();
    });

    it('throws an exception', () => {
      plugin.createGlobalTables().should.be.rejected;
    });
  });

  describe('when an exception occurs adding a replica table', () => {

    before(async () => {
      given_aws_dynamodb_is_mocked();
      addReplicas.rejects({ code: 'UnhandledException' });
      serverless = given_a_serverless_stack_with_some_tables();
      plugin = new CreateDynamoDBGlobalTables(serverless);
    });

    after(() => {
      AWSMock.restore();
    });

    it('throws an exception', () => {
      plugin.createGlobalTables().should.be.rejected;
    });
  });

  describe('when the plugin is disabled', () => {

    before(async () => {
      given_aws_dynamodb_is_mocked();
      serverless = given_the_plugin_is_disabled();
      plugin = new CreateDynamoDBGlobalTables(serverless);
      await plugin.createGlobalTables();
    });

    after(() => {
      AWSMock.restore();
    });

    it('does not create any global tables', () => {
      createGlobalTables.should.not.have.been.called;
    });

    it('does not add any replicas', () => {
      addReplicas.should.not.have.been.called;
    });
  });
});

const given_aws_dynamodb_is_mocked = () => {
  createGlobalTables = sinon.stub().resolves();
  addReplicas = sinon.stub().resolves();
  AWSMock.mock('DynamoDB', 'createGlobalTable', createGlobalTables);
  AWSMock.mock('DynamoDB', 'updateGlobalTable', addReplicas);
};

const given_a_serverless_stack_without_any_tables = () => ({
  getProvider: () => ({ getRegion: () => 'eu-west-2' }),
  cli: { consoleLog: () => { } },
  service: {
    resources: {
      Resources: {
        Type: 'AWS::SomeService::NotATable'
      }
    }
  }
});

const given_a_serverless_stack_with_some_tables = () => ({
  getProvider: () => ({ getRegion: () => 'eu-west-2' }),
  cli: { consoleLog: () => { } },
  service: {
    resources: {
      Resources: {
        'table-one': {
          Type: 'AWS::DynamoDB::Table',
          Properties: {
            TableName: 'table-one'
          }
        },
        'table-two': {
          Type: 'AWS::DynamoDB::Table',
          Properties: {
            TableName: 'table-two'
          }
        }
      }
    }
  }
});

const given_the_plugin_is_disabled = () => ({
  getProvider: () => ({ getRegion: () => 'eu-west-2' }),
  cli: { consoleLog: () => { } },
  service: {
    custom: {
      dynamoDBGlobalTables : {
        enabled: false
      }
    }
  }
});