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

describe('Creating a global dynamodb tables', () => {
  let serverless, plugin;
  let createGlobalTables = sinon.stub().resolves();
  let addReplicas = sinon.stub().resolves();

  before(async () => {
    AWSMock.mock('DynamoDB', 'createGlobalTable', createGlobalTables);
    AWSMock.mock('DynamoDB', 'updateGlobalTable', addReplicas);
  });

  describe('when the stack does not contain any dynamodb tables', () => {

    before(async () => {
      serverless = given_a_serverless_stack_without_any_tables();
      plugin = new CreateDynamoDBGlobalTables(serverless);
      await plugin.createGlobalTables();
    });

    after(() => {
      createGlobalTables.reset();
      addReplicas.reset();
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
      let createGlobalTables = sinon.stub().resolves();
      let addReplicas = sinon.stub().resolves();
      AWSMock.mock('DynamoDB', 'createGlobalTable', createGlobalTables);
      AWSMock.mock('DynamoDB', 'updateGlobalTable', addReplicas);
      serverless = given_a_serverless_stack_with_some_tables();
      plugin = new CreateDynamoDBGlobalTables(serverless);
      await plugin.createGlobalTables();
    });

    after(() => {
      createGlobalTables.reset();
      addReplicas.reset();
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
      serverless = given_a_serverless_stack_with_some_tables();
      createGlobalTables.rejects({ code: 'GlobalTableAlreadyExistsException' });
      plugin = new CreateDynamoDBGlobalTables(serverless);
      await plugin.createGlobalTables();
    });

    after(() => {
      createGlobalTables.reset();
      addReplicas.reset();
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
      serverless = given_a_serverless_stack_with_some_tables();
      addReplicas.rejects({ code: 'ReplicaAlreadyExistsException' });
      plugin = new CreateDynamoDBGlobalTables(serverless);
      await plugin.createGlobalTables();
    });

    after(() => {
      createGlobalTables.reset();
      addReplicas.reset();
    });

    it('attempts to add a replica table for all table resource', () => {
      addReplicas.should.have.been.calledTwice;
    });
  });

  describe('when an exception occurs creating the global table', () => {

    before(async () => {
      serverless = given_a_serverless_stack_with_some_tables();
      createGlobalTables.rejects({ code: 'UnhandledException' });
      plugin = new CreateDynamoDBGlobalTables(serverless);
    });

    after(() => {
      createGlobalTables.reset();
      addReplicas.reset();
    });

    it('throws an exception', () => {
      plugin.createGlobalTables().should.be.rejected;
    });
  });

  describe('when an exception occurs adding a replica table', () => {

    before(async () => {
      serverless = given_a_serverless_stack_with_some_tables();
      addReplicas.rejects({ code: 'UnhandledException' });
      plugin = new CreateDynamoDBGlobalTables(serverless);
    });

    after(() => {
      createGlobalTables.reset();
      addReplicas.reset();
    });

    it('throws an exception', () => {
      plugin.createGlobalTables().should.be.rejected;
    });
  });
});


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