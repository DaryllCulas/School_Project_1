"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _crypto = _interopRequireDefault(require("crypto"));

var _os = _interopRequireDefault(require("os"));

var _dns = _interopRequireDefault(require("dns"));

var _constants = _interopRequireDefault(require("constants"));

var _stream = require("stream");

var _identity = require("@azure/identity");

var _bulkLoad = _interopRequireDefault(require("./bulk-load"));

var _debug = _interopRequireDefault(require("./debug"));

var _events = require("events");

var _instanceLookup = require("./instance-lookup");

var _transientErrorLookup = require("./transient-error-lookup");

var _packet = require("./packet");

var _preloginPayload = _interopRequireDefault(require("./prelogin-payload"));

var _login7Payload = _interopRequireDefault(require("./login7-payload"));

var _ntlmPayload = _interopRequireDefault(require("./ntlm-payload"));

var _request = _interopRequireDefault(require("./request"));

var _rpcrequestPayload = _interopRequireDefault(require("./rpcrequest-payload"));

var _sqlbatchPayload = _interopRequireDefault(require("./sqlbatch-payload"));

var _messageIo = _interopRequireDefault(require("./message-io"));

var _tokenStreamParser = require("./token/token-stream-parser");

var _transaction = require("./transaction");

var _errors = require("./errors");

var _connector = require("./connector");

var _library = require("./library");

var _tdsVersions = require("./tds-versions");

var _message = _interopRequireDefault(require("./message"));

var _ntlm = require("./ntlm");

var _nodeAbortController = require("node-abort-controller");

var _dataType = require("./data-type");

var _bulkLoadPayload = require("./bulk-load-payload");

var _esAggregateError = _interopRequireDefault(require("es-aggregate-error"));

var _package = require("../package.json");

var _url = require("url");

var _handler = require("./token/handler");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @private
 */
const KEEP_ALIVE_INITIAL_DELAY = 30 * 1000;
/**
 * @private
 */

const DEFAULT_CONNECT_TIMEOUT = 15 * 1000;
/**
 * @private
 */

const DEFAULT_CLIENT_REQUEST_TIMEOUT = 15 * 1000;
/**
 * @private
 */

const DEFAULT_CANCEL_TIMEOUT = 5 * 1000;
/**
 * @private
 */

const DEFAULT_CONNECT_RETRY_INTERVAL = 500;
/**
 * @private
 */

const DEFAULT_PACKET_SIZE = 4 * 1024;
/**
 * @private
 */

const DEFAULT_TEXTSIZE = 2147483647;
/**
 * @private
 */

const DEFAULT_DATEFIRST = 7;
/**
 * @private
 */

const DEFAULT_PORT = 1433;
/**
 * @private
 */

const DEFAULT_TDS_VERSION = '7_4';
/**
 * @private
 */

const DEFAULT_LANGUAGE = 'us_english';
/**
 * @private
 */

const DEFAULT_DATEFORMAT = 'mdy';

/**
 * @private
 */
const CLEANUP_TYPE = {
  NORMAL: 0,
  REDIRECT: 1,
  RETRY: 2
};

/**
 * A [[Connection]] instance represents a single connection to a database server.
 *
 * ```js
 * var Connection = require('tedious').Connection;
 * var config = {
 *  "authentication": {
 *    ...,
 *    "options": {...}
 *  },
 *  "options": {...}
 * };
 * var connection = new Connection(config);
 * ```
 *
 * Only one request at a time may be executed on a connection. Once a [[Request]]
 * has been initiated (with [[Connection.callProcedure]], [[Connection.execSql]],
 * or [[Connection.execSqlBatch]]), another should not be initiated until the
 * [[Request]]'s completion callback is called.
 */
class Connection extends _events.EventEmitter {
  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * Note: be aware of the different options field:
   * 1. config.authentication.options
   * 2. config.options
   *
   * ```js
   * const { Connection } = require('tedious');
   *
   * const config = {
   *  "authentication": {
   *    ...,
   *    "options": {...}
   *  },
   *  "options": {...}
   * };
   *
   * const connection = new Connection(config);
   * ```
   *
   * @param config
   */
  constructor(config) {
    super();
    this.fedAuthRequired = void 0;
    this.config = void 0;
    this.secureContextOptions = void 0;
    this.inTransaction = void 0;
    this.transactionDescriptors = void 0;
    this.transactionDepth = void 0;
    this.isSqlBatch = void 0;
    this.curTransientRetryCount = void 0;
    this.transientErrorLookup = void 0;
    this.closed = void 0;
    this.loginError = void 0;
    this.debug = void 0;
    this.ntlmpacket = void 0;
    this.ntlmpacketBuffer = void 0;
    this.routingData = void 0;
    this.messageIo = void 0;
    this.state = void 0;
    this.resetConnectionOnNextRequest = void 0;
    this.request = void 0;
    this.procReturnStatusValue = void 0;
    this.socket = void 0;
    this.messageBuffer = void 0;
    this.connectTimer = void 0;
    this.cancelTimer = void 0;
    this.requestTimer = void 0;
    this.retryTimer = void 0;
    this._cancelAfterRequestSent = void 0;
    this.databaseCollation = void 0;

    if (typeof config !== 'object' || config === null) {
      throw new TypeError('The "config" argument is required and must be of type Object.');
    }

    if (typeof config.server !== 'string') {
      throw new TypeError('The "config.server" property is required and must be of type string.');
    }

    this.fedAuthRequired = false;
    let authentication;

    if (config.authentication !== undefined) {
      if (typeof config.authentication !== 'object' || config.authentication === null) {
        throw new TypeError('The "config.authentication" property must be of type Object.');
      }

      const type = config.authentication.type;
      const options = config.authentication.options === undefined ? {} : config.authentication.options;

      if (typeof type !== 'string') {
        throw new TypeError('The "config.authentication.type" property must be of type string.');
      }

      if (type !== 'default' && type !== 'ntlm' && type !== 'azure-active-directory-password' && type !== 'azure-active-directory-access-token' && type !== 'azure-active-directory-msi-vm' && type !== 'azure-active-directory-msi-app-service' && type !== 'azure-active-directory-service-principal-secret' && type !== 'azure-active-directory-default') {
        throw new TypeError('The "type" property must one of "default", "ntlm", "azure-active-directory-password", "azure-active-directory-access-token", "azure-active-directory-default", "azure-active-directory-msi-vm" or "azure-active-directory-msi-app-service" or "azure-active-directory-service-principal-secret".');
      }

      if (typeof options !== 'object' || options === null) {
        throw new TypeError('The "config.authentication.options" property must be of type object.');
      }

      if (type === 'ntlm') {
        if (typeof options.domain !== 'string') {
          throw new TypeError('The "config.authentication.options.domain" property must be of type string.');
        }

        if (options.userName !== undefined && typeof options.userName !== 'string') {
          throw new TypeError('The "config.authentication.options.userName" property must be of type string.');
        }

        if (options.password !== undefined && typeof options.password !== 'string') {
          throw new TypeError('The "config.authentication.options.password" property must be of type string.');
        }

        authentication = {
          type: 'ntlm',
          options: {
            userName: options.userName,
            password: options.password,
            domain: options.domain && options.domain.toUpperCase()
          }
        };
      } else if (type === 'azure-active-directory-password') {
        if (typeof options.clientId !== 'string') {
          throw new TypeError('The "config.authentication.options.clientId" property must be of type string.');
        }

        if (options.userName !== undefined && typeof options.userName !== 'string') {
          throw new TypeError('The "config.authentication.options.userName" property must be of type string.');
        }

        if (options.password !== undefined && typeof options.password !== 'string') {
          throw new TypeError('The "config.authentication.options.password" property must be of type string.');
        }

        if (options.tenantId !== undefined && typeof options.tenantId !== 'string') {
          throw new TypeError('The "config.authentication.options.tenantId" property must be of type string.');
        }

        authentication = {
          type: 'azure-active-directory-password',
          options: {
            userName: options.userName,
            password: options.password,
            tenantId: options.tenantId,
            clientId: options.clientId
          }
        };
      } else if (type === 'azure-active-directory-access-token') {
        if (typeof options.token !== 'string') {
          throw new TypeError('The "config.authentication.options.token" property must be of type string.');
        }

        authentication = {
          type: 'azure-active-directory-access-token',
          options: {
            token: options.token
          }
        };
      } else if (type === 'azure-active-directory-msi-vm') {
        if (options.clientId !== undefined && typeof options.clientId !== 'string') {
          throw new TypeError('The "config.authentication.options.clientId" property must be of type string.');
        }

        authentication = {
          type: 'azure-active-directory-msi-vm',
          options: {
            clientId: options.clientId
          }
        };
      } else if (type === 'azure-active-directory-default') {
        if (options.clientId !== undefined && typeof options.clientId !== 'string') {
          throw new TypeError('The "config.authentication.options.clientId" property must be of type string.');
        }

        authentication = {
          type: 'azure-active-directory-default',
          options: {
            clientId: options.clientId
          }
        };
      } else if (type === 'azure-active-directory-msi-app-service') {
        if (options.clientId !== undefined && typeof options.clientId !== 'string') {
          throw new TypeError('The "config.authentication.options.clientId" property must be of type string.');
        }

        authentication = {
          type: 'azure-active-directory-msi-app-service',
          options: {
            clientId: options.clientId
          }
        };
      } else if (type === 'azure-active-directory-service-principal-secret') {
        if (typeof options.clientId !== 'string') {
          throw new TypeError('The "config.authentication.options.clientId" property must be of type string.');
        }

        if (typeof options.clientSecret !== 'string') {
          throw new TypeError('The "config.authentication.options.clientSecret" property must be of type string.');
        }

        if (typeof options.tenantId !== 'string') {
          throw new TypeError('The "config.authentication.options.tenantId" property must be of type string.');
        }

        authentication = {
          type: 'azure-active-directory-service-principal-secret',
          options: {
            clientId: options.clientId,
            clientSecret: options.clientSecret,
            tenantId: options.tenantId
          }
        };
      } else {
        if (options.userName !== undefined && typeof options.userName !== 'string') {
          throw new TypeError('The "config.authentication.options.userName" property must be of type string.');
        }

        if (options.password !== undefined && typeof options.password !== 'string') {
          throw new TypeError('The "config.authentication.options.password" property must be of type string.');
        }

        authentication = {
          type: 'default',
          options: {
            userName: options.userName,
            password: options.password
          }
        };
      }
    } else {
      authentication = {
        type: 'default',
        options: {
          userName: undefined,
          password: undefined
        }
      };
    }

    this.config = {
      server: config.server,
      authentication: authentication,
      options: {
        abortTransactionOnError: false,
        appName: undefined,
        camelCaseColumns: false,
        cancelTimeout: DEFAULT_CANCEL_TIMEOUT,
        columnEncryptionKeyCacheTTL: 2 * 60 * 60 * 1000,
        // Units: miliseconds
        columnEncryptionSetting: false,
        columnNameReplacer: undefined,
        connectionRetryInterval: DEFAULT_CONNECT_RETRY_INTERVAL,
        connectTimeout: DEFAULT_CONNECT_TIMEOUT,
        connector: undefined,
        connectionIsolationLevel: _transaction.ISOLATION_LEVEL.READ_COMMITTED,
        cryptoCredentialsDetails: {},
        database: undefined,
        datefirst: DEFAULT_DATEFIRST,
        dateFormat: DEFAULT_DATEFORMAT,
        debug: {
          data: false,
          packet: false,
          payload: false,
          token: false
        },
        enableAnsiNull: true,
        enableAnsiNullDefault: true,
        enableAnsiPadding: true,
        enableAnsiWarnings: true,
        enableArithAbort: true,
        enableConcatNullYieldsNull: true,
        enableCursorCloseOnCommit: null,
        enableImplicitTransactions: false,
        enableNumericRoundabort: false,
        enableQuotedIdentifier: true,
        encrypt: true,
        fallbackToDefaultDb: false,
        encryptionKeyStoreProviders: undefined,
        instanceName: undefined,
        isolationLevel: _transaction.ISOLATION_LEVEL.READ_COMMITTED,
        language: DEFAULT_LANGUAGE,
        localAddress: undefined,
        maxRetriesOnTransientErrors: 3,
        multiSubnetFailover: false,
        packetSize: DEFAULT_PACKET_SIZE,
        port: DEFAULT_PORT,
        readOnlyIntent: false,
        requestTimeout: DEFAULT_CLIENT_REQUEST_TIMEOUT,
        rowCollectionOnDone: false,
        rowCollectionOnRequestCompletion: false,
        serverName: undefined,
        serverSupportsColumnEncryption: false,
        tdsVersion: DEFAULT_TDS_VERSION,
        textsize: DEFAULT_TEXTSIZE,
        trustedServerNameAE: undefined,
        trustServerCertificate: false,
        useColumnNames: false,
        useUTC: true,
        workstationId: undefined,
        lowerCaseGuids: false
      }
    };

    if (config.options) {
      if (config.options.port && config.options.instanceName) {
        throw new Error('Port and instanceName are mutually exclusive, but ' + config.options.port + ' and ' + config.options.instanceName + ' provided');
      }

      if (config.options.abortTransactionOnError !== undefined) {
        if (typeof config.options.abortTransactionOnError !== 'boolean' && config.options.abortTransactionOnError !== null) {
          throw new TypeError('The "config.options.abortTransactionOnError" property must be of type string or null.');
        }

        this.config.options.abortTransactionOnError = config.options.abortTransactionOnError;
      }

      if (config.options.appName !== undefined) {
        if (typeof config.options.appName !== 'string') {
          throw new TypeError('The "config.options.appName" property must be of type string.');
        }

        this.config.options.appName = config.options.appName;
      }

      if (config.options.camelCaseColumns !== undefined) {
        if (typeof config.options.camelCaseColumns !== 'boolean') {
          throw new TypeError('The "config.options.camelCaseColumns" property must be of type boolean.');
        }

        this.config.options.camelCaseColumns = config.options.camelCaseColumns;
      }

      if (config.options.cancelTimeout !== undefined) {
        if (typeof config.options.cancelTimeout !== 'number') {
          throw new TypeError('The "config.options.cancelTimeout" property must be of type number.');
        }

        this.config.options.cancelTimeout = config.options.cancelTimeout;
      }

      if (config.options.columnNameReplacer) {
        if (typeof config.options.columnNameReplacer !== 'function') {
          throw new TypeError('The "config.options.cancelTimeout" property must be of type function.');
        }

        this.config.options.columnNameReplacer = config.options.columnNameReplacer;
      }

      if (config.options.connectionIsolationLevel !== undefined) {
        (0, _transaction.assertValidIsolationLevel)(config.options.connectionIsolationLevel, 'config.options.connectionIsolationLevel');
        this.config.options.connectionIsolationLevel = config.options.connectionIsolationLevel;
      }

      if (config.options.connectTimeout !== undefined) {
        if (typeof config.options.connectTimeout !== 'number') {
          throw new TypeError('The "config.options.connectTimeout" property must be of type number.');
        }

        this.config.options.connectTimeout = config.options.connectTimeout;
      }

      if (config.options.connector !== undefined) {
        if (typeof config.options.connector !== 'function') {
          throw new TypeError('The "config.options.connector" property must be a function.');
        }

        this.config.options.connector = config.options.connector;
      }

      if (config.options.cryptoCredentialsDetails !== undefined) {
        if (typeof config.options.cryptoCredentialsDetails !== 'object' || config.options.cryptoCredentialsDetails === null) {
          throw new TypeError('The "config.options.cryptoCredentialsDetails" property must be of type Object.');
        }

        this.config.options.cryptoCredentialsDetails = config.options.cryptoCredentialsDetails;
      }

      if (config.options.database !== undefined) {
        if (typeof config.options.database !== 'string') {
          throw new TypeError('The "config.options.database" property must be of type string.');
        }

        this.config.options.database = config.options.database;
      }

      if (config.options.datefirst !== undefined) {
        if (typeof config.options.datefirst !== 'number' && config.options.datefirst !== null) {
          throw new TypeError('The "config.options.datefirst" property must be of type number.');
        }

        if (config.options.datefirst !== null && (config.options.datefirst < 1 || config.options.datefirst > 7)) {
          throw new RangeError('The "config.options.datefirst" property must be >= 1 and <= 7');
        }

        this.config.options.datefirst = config.options.datefirst;
      }

      if (config.options.dateFormat !== undefined) {
        if (typeof config.options.dateFormat !== 'string' && config.options.dateFormat !== null) {
          throw new TypeError('The "config.options.dateFormat" property must be of type string or null.');
        }

        this.config.options.dateFormat = config.options.dateFormat;
      }

      if (config.options.debug) {
        if (config.options.debug.data !== undefined) {
          if (typeof config.options.debug.data !== 'boolean') {
            throw new TypeError('The "config.options.debug.data" property must be of type boolean.');
          }

          this.config.options.debug.data = config.options.debug.data;
        }

        if (config.options.debug.packet !== undefined) {
          if (typeof config.options.debug.packet !== 'boolean') {
            throw new TypeError('The "config.options.debug.packet" property must be of type boolean.');
          }

          this.config.options.debug.packet = config.options.debug.packet;
        }

        if (config.options.debug.payload !== undefined) {
          if (typeof config.options.debug.payload !== 'boolean') {
            throw new TypeError('The "config.options.debug.payload" property must be of type boolean.');
          }

          this.config.options.debug.payload = config.options.debug.payload;
        }

        if (config.options.debug.token !== undefined) {
          if (typeof config.options.debug.token !== 'boolean') {
            throw new TypeError('The "config.options.debug.token" property must be of type boolean.');
          }

          this.config.options.debug.token = config.options.debug.token;
        }
      }

      if (config.options.enableAnsiNull !== undefined) {
        if (typeof config.options.enableAnsiNull !== 'boolean' && config.options.enableAnsiNull !== null) {
          throw new TypeError('The "config.options.enableAnsiNull" property must be of type boolean or null.');
        }

        this.config.options.enableAnsiNull = config.options.enableAnsiNull;
      }

      if (config.options.enableAnsiNullDefault !== undefined) {
        if (typeof config.options.enableAnsiNullDefault !== 'boolean' && config.options.enableAnsiNullDefault !== null) {
          throw new TypeError('The "config.options.enableAnsiNullDefault" property must be of type boolean or null.');
        }

        this.config.options.enableAnsiNullDefault = config.options.enableAnsiNullDefault;
      }

      if (config.options.enableAnsiPadding !== undefined) {
        if (typeof config.options.enableAnsiPadding !== 'boolean' && config.options.enableAnsiPadding !== null) {
          throw new TypeError('The "config.options.enableAnsiPadding" property must be of type boolean or null.');
        }

        this.config.options.enableAnsiPadding = config.options.enableAnsiPadding;
      }

      if (config.options.enableAnsiWarnings !== undefined) {
        if (typeof config.options.enableAnsiWarnings !== 'boolean' && config.options.enableAnsiWarnings !== null) {
          throw new TypeError('The "config.options.enableAnsiWarnings" property must be of type boolean or null.');
        }

        this.config.options.enableAnsiWarnings = config.options.enableAnsiWarnings;
      }

      if (config.options.enableArithAbort !== undefined) {
        if (typeof config.options.enableArithAbort !== 'boolean' && config.options.enableArithAbort !== null) {
          throw new TypeError('The "config.options.enableArithAbort" property must be of type boolean or null.');
        }

        this.config.options.enableArithAbort = config.options.enableArithAbort;
      }

      if (config.options.enableConcatNullYieldsNull !== undefined) {
        if (typeof config.options.enableConcatNullYieldsNull !== 'boolean' && config.options.enableConcatNullYieldsNull !== null) {
          throw new TypeError('The "config.options.enableConcatNullYieldsNull" property must be of type boolean or null.');
        }

        this.config.options.enableConcatNullYieldsNull = config.options.enableConcatNullYieldsNull;
      }

      if (config.options.enableCursorCloseOnCommit !== undefined) {
        if (typeof config.options.enableCursorCloseOnCommit !== 'boolean' && config.options.enableCursorCloseOnCommit !== null) {
          throw new TypeError('The "config.options.enableCursorCloseOnCommit" property must be of type boolean or null.');
        }

        this.config.options.enableCursorCloseOnCommit = config.options.enableCursorCloseOnCommit;
      }

      if (config.options.enableImplicitTransactions !== undefined) {
        if (typeof config.options.enableImplicitTransactions !== 'boolean' && config.options.enableImplicitTransactions !== null) {
          throw new TypeError('The "config.options.enableImplicitTransactions" property must be of type boolean or null.');
        }

        this.config.options.enableImplicitTransactions = config.options.enableImplicitTransactions;
      }

      if (config.options.enableNumericRoundabort !== undefined) {
        if (typeof config.options.enableNumericRoundabort !== 'boolean' && config.options.enableNumericRoundabort !== null) {
          throw new TypeError('The "config.options.enableNumericRoundabort" property must be of type boolean or null.');
        }

        this.config.options.enableNumericRoundabort = config.options.enableNumericRoundabort;
      }

      if (config.options.enableQuotedIdentifier !== undefined) {
        if (typeof config.options.enableQuotedIdentifier !== 'boolean' && config.options.enableQuotedIdentifier !== null) {
          throw new TypeError('The "config.options.enableQuotedIdentifier" property must be of type boolean or null.');
        }

        this.config.options.enableQuotedIdentifier = config.options.enableQuotedIdentifier;
      }

      if (config.options.encrypt !== undefined) {
        if (typeof config.options.encrypt !== 'boolean') {
          throw new TypeError('The "config.options.encrypt" property must be of type boolean.');
        }

        this.config.options.encrypt = config.options.encrypt;
      }

      if (config.options.fallbackToDefaultDb !== undefined) {
        if (typeof config.options.fallbackToDefaultDb !== 'boolean') {
          throw new TypeError('The "config.options.fallbackToDefaultDb" property must be of type boolean.');
        }

        this.config.options.fallbackToDefaultDb = config.options.fallbackToDefaultDb;
      }

      if (config.options.instanceName !== undefined) {
        if (typeof config.options.instanceName !== 'string') {
          throw new TypeError('The "config.options.instanceName" property must be of type string.');
        }

        this.config.options.instanceName = config.options.instanceName;
        this.config.options.port = undefined;
      }

      if (config.options.isolationLevel !== undefined) {
        (0, _transaction.assertValidIsolationLevel)(config.options.isolationLevel, 'config.options.isolationLevel');
        this.config.options.isolationLevel = config.options.isolationLevel;
      }

      if (config.options.language !== undefined) {
        if (typeof config.options.language !== 'string' && config.options.language !== null) {
          throw new TypeError('The "config.options.language" property must be of type string or null.');
        }

        this.config.options.language = config.options.language;
      }

      if (config.options.localAddress !== undefined) {
        if (typeof config.options.localAddress !== 'string') {
          throw new TypeError('The "config.options.localAddress" property must be of type string.');
        }

        this.config.options.localAddress = config.options.localAddress;
      }

      if (config.options.multiSubnetFailover !== undefined) {
        if (typeof config.options.multiSubnetFailover !== 'boolean') {
          throw new TypeError('The "config.options.multiSubnetFailover" property must be of type boolean.');
        }

        this.config.options.multiSubnetFailover = config.options.multiSubnetFailover;
      }

      if (config.options.packetSize !== undefined) {
        if (typeof config.options.packetSize !== 'number') {
          throw new TypeError('The "config.options.packetSize" property must be of type number.');
        }

        this.config.options.packetSize = config.options.packetSize;
      }

      if (config.options.port !== undefined) {
        if (typeof config.options.port !== 'number') {
          throw new TypeError('The "config.options.port" property must be of type number.');
        }

        if (config.options.port <= 0 || config.options.port >= 65536) {
          throw new RangeError('The "config.options.port" property must be > 0 and < 65536');
        }

        this.config.options.port = config.options.port;
        this.config.options.instanceName = undefined;
      }

      if (config.options.readOnlyIntent !== undefined) {
        if (typeof config.options.readOnlyIntent !== 'boolean') {
          throw new TypeError('The "config.options.readOnlyIntent" property must be of type boolean.');
        }

        this.config.options.readOnlyIntent = config.options.readOnlyIntent;
      }

      if (config.options.requestTimeout !== undefined) {
        if (typeof config.options.requestTimeout !== 'number') {
          throw new TypeError('The "config.options.requestTimeout" property must be of type number.');
        }

        this.config.options.requestTimeout = config.options.requestTimeout;
      }

      if (config.options.maxRetriesOnTransientErrors !== undefined) {
        if (typeof config.options.maxRetriesOnTransientErrors !== 'number') {
          throw new TypeError('The "config.options.maxRetriesOnTransientErrors" property must be of type number.');
        }

        if (config.options.maxRetriesOnTransientErrors < 0) {
          throw new TypeError('The "config.options.maxRetriesOnTransientErrors" property must be equal or greater than 0.');
        }

        this.config.options.maxRetriesOnTransientErrors = config.options.maxRetriesOnTransientErrors;
      }

      if (config.options.connectionRetryInterval !== undefined) {
        if (typeof config.options.connectionRetryInterval !== 'number') {
          throw new TypeError('The "config.options.connectionRetryInterval" property must be of type number.');
        }

        if (config.options.connectionRetryInterval <= 0) {
          throw new TypeError('The "config.options.connectionRetryInterval" property must be greater than 0.');
        }

        this.config.options.connectionRetryInterval = config.options.connectionRetryInterval;
      }

      if (config.options.rowCollectionOnDone !== undefined) {
        if (typeof config.options.rowCollectionOnDone !== 'boolean') {
          throw new TypeError('The "config.options.rowCollectionOnDone" property must be of type boolean.');
        }

        this.config.options.rowCollectionOnDone = config.options.rowCollectionOnDone;
      }

      if (config.options.rowCollectionOnRequestCompletion !== undefined) {
        if (typeof config.options.rowCollectionOnRequestCompletion !== 'boolean') {
          throw new TypeError('The "config.options.rowCollectionOnRequestCompletion" property must be of type boolean.');
        }

        this.config.options.rowCollectionOnRequestCompletion = config.options.rowCollectionOnRequestCompletion;
      }

      if (config.options.tdsVersion !== undefined) {
        if (typeof config.options.tdsVersion !== 'string') {
          throw new TypeError('The "config.options.tdsVersion" property must be of type string.');
        }

        this.config.options.tdsVersion = config.options.tdsVersion;
      }

      if (config.options.textsize !== undefined) {
        if (typeof config.options.textsize !== 'number' && config.options.textsize !== null) {
          throw new TypeError('The "config.options.textsize" property must be of type number or null.');
        }

        if (config.options.textsize > 2147483647) {
          throw new TypeError('The "config.options.textsize" can\'t be greater than 2147483647.');
        } else if (config.options.textsize < -1) {
          throw new TypeError('The "config.options.textsize" can\'t be smaller than -1.');
        }

        this.config.options.textsize = config.options.textsize | 0;
      }

      if (config.options.trustServerCertificate !== undefined) {
        if (typeof config.options.trustServerCertificate !== 'boolean') {
          throw new TypeError('The "config.options.trustServerCertificate" property must be of type boolean.');
        }

        this.config.options.trustServerCertificate = config.options.trustServerCertificate;
      }

      if (config.options.useColumnNames !== undefined) {
        if (typeof config.options.useColumnNames !== 'boolean') {
          throw new TypeError('The "config.options.useColumnNames" property must be of type boolean.');
        }

        this.config.options.useColumnNames = config.options.useColumnNames;
      }

      if (config.options.useUTC !== undefined) {
        if (typeof config.options.useUTC !== 'boolean') {
          throw new TypeError('The "config.options.useUTC" property must be of type boolean.');
        }

        this.config.options.useUTC = config.options.useUTC;
      }

      if (config.options.workstationId !== undefined) {
        if (typeof config.options.workstationId !== 'string') {
          throw new TypeError('The "config.options.workstationId" property must be of type string.');
        }

        this.config.options.workstationId = config.options.workstationId;
      }

      if (config.options.lowerCaseGuids !== undefined) {
        if (typeof config.options.lowerCaseGuids !== 'boolean') {
          throw new TypeError('The "config.options.lowerCaseGuids" property must be of type boolean.');
        }

        this.config.options.lowerCaseGuids = config.options.lowerCaseGuids;
      }
    }

    this.secureContextOptions = this.config.options.cryptoCredentialsDetails;

    if (this.secureContextOptions.secureOptions === undefined) {
      // If the caller has not specified their own `secureOptions`,
      // we set `SSL_OP_DONT_INSERT_EMPTY_FRAGMENTS` here.
      // Older SQL Server instances running on older Windows versions have
      // trouble with the BEAST workaround in OpenSSL.
      // As BEAST is a browser specific exploit, we can just disable this option here.
      this.secureContextOptions = Object.create(this.secureContextOptions, {
        secureOptions: {
          value: _constants.default.SSL_OP_DONT_INSERT_EMPTY_FRAGMENTS
        }
      });
    }

    this.debug = this.createDebug();
    this.inTransaction = false;
    this.transactionDescriptors = [Buffer.from([0, 0, 0, 0, 0, 0, 0, 0])]; // 'beginTransaction', 'commitTransaction' and 'rollbackTransaction'
    // events are utilized to maintain inTransaction property state which in
    // turn is used in managing transactions. These events are only fired for
    // TDS version 7.2 and beyond. The properties below are used to emulate
    // equivalent behavior for TDS versions before 7.2.

    this.transactionDepth = 0;
    this.isSqlBatch = false;
    this.closed = false;
    this.messageBuffer = Buffer.alloc(0);
    this.curTransientRetryCount = 0;
    this.transientErrorLookup = new _transientErrorLookup.TransientErrorLookup();
    this.state = this.STATE.INITIALIZED;

    this._cancelAfterRequestSent = () => {
      this.messageIo.sendMessage(_packet.TYPE.ATTENTION);
      this.createCancelTimer();
    };
  }

  connect(connectListener) {
    if (this.state !== this.STATE.INITIALIZED) {
      throw new _errors.ConnectionError('`.connect` can not be called on a Connection in `' + this.state.name + '` state.');
    }

    if (connectListener) {
      const onConnect = err => {
        this.removeListener('error', onError);
        connectListener(err);
      };

      const onError = err => {
        this.removeListener('connect', onConnect);
        connectListener(err);
      };

      this.once('connect', onConnect);
      this.once('error', onError);
    }

    this.transitionTo(this.STATE.CONNECTING);
  }
  /**
   * The server has reported that the charset has changed.
   */


  on(event, listener) {
    return super.on(event, listener);
  }
  /**
   * @private
   */


  emit(event, ...args) {
    return super.emit(event, ...args);
  }
  /**
   * Closes the connection to the database.
   *
   * The [[Event_end]] will be emitted once the connection has been closed.
   */


  close() {
    this.transitionTo(this.STATE.FINAL);
  }
  /**
   * @private
   */


  initialiseConnection() {
    const signal = this.createConnectTimer();

    if (this.config.options.port) {
      return this.connectOnPort(this.config.options.port, this.config.options.multiSubnetFailover, signal, this.config.options.connector);
    } else {
      return (0, _instanceLookup.instanceLookup)({
        server: this.config.server,
        instanceName: this.config.options.instanceName,
        timeout: this.config.options.connectTimeout,
        signal: signal
      }).then(port => {
        process.nextTick(() => {
          this.connectOnPort(port, this.config.options.multiSubnetFailover, signal, this.config.options.connector);
        });
      }, err => {
        this.clearConnectTimer();

        if (err.name === 'AbortError') {
          // Ignore the AbortError for now, this is still handled by the connectTimer firing
          return;
        }

        process.nextTick(() => {
          this.emit('connect', new _errors.ConnectionError(err.message, 'EINSTLOOKUP'));
        });
      });
    }
  }
  /**
   * @private
   */


  cleanupConnection(cleanupType) {
    if (!this.closed) {
      this.clearConnectTimer();
      this.clearRequestTimer();
      this.clearRetryTimer();
      this.closeConnection();

      if (cleanupType === CLEANUP_TYPE.REDIRECT) {
        this.emit('rerouting');
      } else if (cleanupType !== CLEANUP_TYPE.RETRY) {
        process.nextTick(() => {
          this.emit('end');
        });
      }

      const request = this.request;

      if (request) {
        const err = new _errors.RequestError('Connection closed before request completed.', 'ECLOSE');
        request.callback(err);
        this.request = undefined;
      }

      this.closed = true;
      this.loginError = undefined;
    }
  }
  /**
   * @private
   */


  createDebug() {
    const debug = new _debug.default(this.config.options.debug);
    debug.on('debug', message => {
      this.emit('debug', message);
    });
    return debug;
  }
  /**
   * @private
   */


  createTokenStreamParser(message, handler) {
    return new _tokenStreamParser.Parser(message, this.debug, handler, this.config.options);
  }

  connectOnPort(port, multiSubnetFailover, signal, customConnector) {
    const connectOpts = {
      host: this.routingData ? this.routingData.server : this.config.server,
      port: this.routingData ? this.routingData.port : port,
      localAddress: this.config.options.localAddress
    };
    const connect = customConnector || (multiSubnetFailover ? _connector.connectInParallel : _connector.connectInSequence);
    connect(connectOpts, _dns.default.lookup, signal).then(socket => {
      process.nextTick(() => {
        socket.on('error', error => {
          this.socketError(error);
        });
        socket.on('close', () => {
          this.socketClose();
        });
        socket.on('end', () => {
          this.socketEnd();
        });
        socket.setKeepAlive(true, KEEP_ALIVE_INITIAL_DELAY);
        this.messageIo = new _messageIo.default(socket, this.config.options.packetSize, this.debug);
        this.messageIo.on('secure', cleartext => {
          this.emit('secure', cleartext);
        });
        this.socket = socket;
        this.closed = false;
        this.debug.log('connected to ' + this.config.server + ':' + this.config.options.port);
        this.sendPreLogin();
        this.transitionTo(this.STATE.SENT_PRELOGIN);
      });
    }, err => {
      this.clearConnectTimer();

      if (err.name === 'AbortError') {
        return;
      }

      process.nextTick(() => {
        this.socketError(err);
      });
    });
  }
  /**
   * @private
   */


  closeConnection() {
    if (this.socket) {
      this.socket.destroy();
    }
  }
  /**
   * @private
   */


  createConnectTimer() {
    const controller = new _nodeAbortController.AbortController();
    this.connectTimer = setTimeout(() => {
      controller.abort();
      this.connectTimeout();
    }, this.config.options.connectTimeout);
    return controller.signal;
  }
  /**
   * @private
   */


  createCancelTimer() {
    this.clearCancelTimer();
    const timeout = this.config.options.cancelTimeout;

    if (timeout > 0) {
      this.cancelTimer = setTimeout(() => {
        this.cancelTimeout();
      }, timeout);
    }
  }
  /**
   * @private
   */


  createRequestTimer() {
    this.clearRequestTimer(); // release old timer, just to be safe

    const request = this.request;
    const timeout = request.timeout !== undefined ? request.timeout : this.config.options.requestTimeout;

    if (timeout) {
      this.requestTimer = setTimeout(() => {
        this.requestTimeout();
      }, timeout);
    }
  }
  /**
   * @private
   */


  createRetryTimer() {
    this.clearRetryTimer();
    this.retryTimer = setTimeout(() => {
      this.retryTimeout();
    }, this.config.options.connectionRetryInterval);
  }
  /**
   * @private
   */


  connectTimeout() {
    const message = `Failed to connect to ${this.config.server}${this.config.options.port ? `:${this.config.options.port}` : `\\${this.config.options.instanceName}`} in ${this.config.options.connectTimeout}ms`;
    this.debug.log(message);
    this.emit('connect', new _errors.ConnectionError(message, 'ETIMEOUT'));
    this.connectTimer = undefined;
    this.dispatchEvent('connectTimeout');
  }
  /**
   * @private
   */


  cancelTimeout() {
    const message = `Failed to cancel request in ${this.config.options.cancelTimeout}ms`;
    this.debug.log(message);
    this.dispatchEvent('socketError', new _errors.ConnectionError(message, 'ETIMEOUT'));
  }
  /**
   * @private
   */


  requestTimeout() {
    this.requestTimer = undefined;
    const request = this.request;
    request.cancel();
    const timeout = request.timeout !== undefined ? request.timeout : this.config.options.requestTimeout;
    const message = 'Timeout: Request failed to complete in ' + timeout + 'ms';
    request.error = new _errors.RequestError(message, 'ETIMEOUT');
  }
  /**
   * @private
   */


  retryTimeout() {
    this.retryTimer = undefined;
    this.emit('retry');
    this.transitionTo(this.STATE.CONNECTING);
  }
  /**
   * @private
   */


  clearConnectTimer() {
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = undefined;
    }
  }
  /**
   * @private
   */


  clearCancelTimer() {
    if (this.cancelTimer) {
      clearTimeout(this.cancelTimer);
      this.cancelTimer = undefined;
    }
  }
  /**
   * @private
   */


  clearRequestTimer() {
    if (this.requestTimer) {
      clearTimeout(this.requestTimer);
      this.requestTimer = undefined;
    }
  }
  /**
   * @private
   */


  clearRetryTimer() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = undefined;
    }
  }
  /**
   * @private
   */


  transitionTo(newState) {
    if (this.state === newState) {
      this.debug.log('State is already ' + newState.name);
      return;
    }

    if (this.state && this.state.exit) {
      this.state.exit.call(this, newState);
    }

    this.debug.log('State change: ' + (this.state ? this.state.name : 'undefined') + ' -> ' + newState.name);
    this.state = newState;

    if (this.state.enter) {
      this.state.enter.apply(this);
    }
  }
  /**
   * @private
   */


  getEventHandler(eventName) {
    const handler = this.state.events[eventName];

    if (!handler) {
      throw new Error(`No event '${eventName}' in state '${this.state.name}'`);
    }

    return handler;
  }
  /**
   * @private
   */


  dispatchEvent(eventName, ...args) {
    const handler = this.state.events[eventName];

    if (handler) {
      handler.apply(this, args);
    } else {
      this.emit('error', new Error(`No event '${eventName}' in state '${this.state.name}'`));
      this.close();
    }
  }
  /**
   * @private
   */


  socketError(error) {
    if (this.state === this.STATE.CONNECTING || this.state === this.STATE.SENT_TLSSSLNEGOTIATION) {
      const message = `Failed to connect to ${this.config.server}:${this.config.options.port} - ${error.message}`;
      this.debug.log(message);
      this.emit('connect', new _errors.ConnectionError(message, 'ESOCKET'));
    } else {
      const message = `Connection lost - ${error.message}`;
      this.debug.log(message);
      this.emit('error', new _errors.ConnectionError(message, 'ESOCKET'));
    }

    this.dispatchEvent('socketError', error);
  }
  /**
   * @private
   */


  socketEnd() {
    this.debug.log('socket ended');

    if (this.state !== this.STATE.FINAL) {
      const error = new Error('socket hang up');
      error.code = 'ECONNRESET';
      this.socketError(error);
    }
  }
  /**
   * @private
   */


  socketClose() {
    this.debug.log('connection to ' + this.config.server + ':' + this.config.options.port + ' closed');

    if (this.state === this.STATE.REROUTING) {
      this.debug.log('Rerouting to ' + this.routingData.server + ':' + this.routingData.port);
      this.dispatchEvent('reconnect');
    } else if (this.state === this.STATE.TRANSIENT_FAILURE_RETRY) {
      const server = this.routingData ? this.routingData.server : this.config.server;
      const port = this.routingData ? this.routingData.port : this.config.options.port;
      this.debug.log('Retry after transient failure connecting to ' + server + ':' + port);
      this.dispatchEvent('retry');
    } else {
      this.transitionTo(this.STATE.FINAL);
    }
  }
  /**
   * @private
   */


  sendPreLogin() {
    const [, major, minor, build] = /^(\d+)\.(\d+)\.(\d+)/.exec(_package.version) ?? ['0.0.0', '0', '0', '0'];
    const payload = new _preloginPayload.default({
      encrypt: this.config.options.encrypt,
      version: {
        major: Number(major),
        minor: Number(minor),
        build: Number(build),
        subbuild: 0
      }
    });
    this.messageIo.sendMessage(_packet.TYPE.PRELOGIN, payload.data);
    this.debug.payload(function () {
      return payload.toString('  ');
    });
  }
  /**
   * @private
   */


  sendLogin7Packet() {
    const payload = new _login7Payload.default({
      tdsVersion: _tdsVersions.versions[this.config.options.tdsVersion],
      packetSize: this.config.options.packetSize,
      clientProgVer: 0,
      clientPid: process.pid,
      connectionId: 0,
      clientTimeZone: new Date().getTimezoneOffset(),
      clientLcid: 0x00000409
    });
    const {
      authentication
    } = this.config;

    switch (authentication.type) {
      case 'azure-active-directory-password':
        payload.fedAuth = {
          type: 'ADAL',
          echo: this.fedAuthRequired,
          workflow: 'default'
        };
        break;

      case 'azure-active-directory-access-token':
        payload.fedAuth = {
          type: 'SECURITYTOKEN',
          echo: this.fedAuthRequired,
          fedAuthToken: authentication.options.token
        };
        break;

      case 'azure-active-directory-msi-vm':
      case 'azure-active-directory-default':
      case 'azure-active-directory-msi-app-service':
      case 'azure-active-directory-service-principal-secret':
        payload.fedAuth = {
          type: 'ADAL',
          echo: this.fedAuthRequired,
          workflow: 'integrated'
        };
        break;

      case 'ntlm':
        payload.sspi = (0, _ntlm.createNTLMRequest)({
          domain: authentication.options.domain
        });
        break;

      default:
        payload.userName = authentication.options.userName;
        payload.password = authentication.options.password;
    }

    payload.hostname = this.config.options.workstationId || _os.default.hostname();
    payload.serverName = this.routingData ? this.routingData.server : this.config.server;
    payload.appName = this.config.options.appName || 'Tedious';
    payload.libraryName = _library.name;
    payload.language = this.config.options.language;
    payload.database = this.config.options.database;
    payload.clientId = Buffer.from([1, 2, 3, 4, 5, 6]);
    payload.readOnlyIntent = this.config.options.readOnlyIntent;
    payload.initDbFatal = !this.config.options.fallbackToDefaultDb;
    this.routingData = undefined;
    this.messageIo.sendMessage(_packet.TYPE.LOGIN7, payload.toBuffer());
    this.debug.payload(function () {
      return payload.toString('  ');
    });
  }
  /**
   * @private
   */


  sendFedAuthTokenMessage(token) {
    const accessTokenLen = Buffer.byteLength(token, 'ucs2');
    const data = Buffer.alloc(8 + accessTokenLen);
    let offset = 0;
    offset = data.writeUInt32LE(accessTokenLen + 4, offset);
    offset = data.writeUInt32LE(accessTokenLen, offset);
    data.write(token, offset, 'ucs2');
    this.messageIo.sendMessage(_packet.TYPE.FEDAUTH_TOKEN, data); // sent the fedAuth token message, the rest is similar to standard login 7

    this.transitionTo(this.STATE.SENT_LOGIN7_WITH_STANDARD_LOGIN);
  }
  /**
   * @private
   */


  sendInitialSql() {
    const payload = new _sqlbatchPayload.default(this.getInitialSql(), this.currentTransactionDescriptor(), this.config.options);
    const message = new _message.default({
      type: _packet.TYPE.SQL_BATCH
    });
    this.messageIo.outgoingMessageStream.write(message);

    _stream.Readable.from(payload).pipe(message);
  }
  /**
   * @private
   */


  getInitialSql() {
    const options = [];

    if (this.config.options.enableAnsiNull === true) {
      options.push('set ansi_nulls on');
    } else if (this.config.options.enableAnsiNull === false) {
      options.push('set ansi_nulls off');
    }

    if (this.config.options.enableAnsiNullDefault === true) {
      options.push('set ansi_null_dflt_on on');
    } else if (this.config.options.enableAnsiNullDefault === false) {
      options.push('set ansi_null_dflt_on off');
    }

    if (this.config.options.enableAnsiPadding === true) {
      options.push('set ansi_padding on');
    } else if (this.config.options.enableAnsiPadding === false) {
      options.push('set ansi_padding off');
    }

    if (this.config.options.enableAnsiWarnings === true) {
      options.push('set ansi_warnings on');
    } else if (this.config.options.enableAnsiWarnings === false) {
      options.push('set ansi_warnings off');
    }

    if (this.config.options.enableArithAbort === true) {
      options.push('set arithabort on');
    } else if (this.config.options.enableArithAbort === false) {
      options.push('set arithabort off');
    }

    if (this.config.options.enableConcatNullYieldsNull === true) {
      options.push('set concat_null_yields_null on');
    } else if (this.config.options.enableConcatNullYieldsNull === false) {
      options.push('set concat_null_yields_null off');
    }

    if (this.config.options.enableCursorCloseOnCommit === true) {
      options.push('set cursor_close_on_commit on');
    } else if (this.config.options.enableCursorCloseOnCommit === false) {
      options.push('set cursor_close_on_commit off');
    }

    if (this.config.options.datefirst !== null) {
      options.push(`set datefirst ${this.config.options.datefirst}`);
    }

    if (this.config.options.dateFormat !== null) {
      options.push(`set dateformat ${this.config.options.dateFormat}`);
    }

    if (this.config.options.enableImplicitTransactions === true) {
      options.push('set implicit_transactions on');
    } else if (this.config.options.enableImplicitTransactions === false) {
      options.push('set implicit_transactions off');
    }

    if (this.config.options.language !== null) {
      options.push(`set language ${this.config.options.language}`);
    }

    if (this.config.options.enableNumericRoundabort === true) {
      options.push('set numeric_roundabort on');
    } else if (this.config.options.enableNumericRoundabort === false) {
      options.push('set numeric_roundabort off');
    }

    if (this.config.options.enableQuotedIdentifier === true) {
      options.push('set quoted_identifier on');
    } else if (this.config.options.enableQuotedIdentifier === false) {
      options.push('set quoted_identifier off');
    }

    if (this.config.options.textsize !== null) {
      options.push(`set textsize ${this.config.options.textsize}`);
    }

    if (this.config.options.connectionIsolationLevel !== null) {
      options.push(`set transaction isolation level ${this.getIsolationLevelText(this.config.options.connectionIsolationLevel)}`);
    }

    if (this.config.options.abortTransactionOnError === true) {
      options.push('set xact_abort on');
    } else if (this.config.options.abortTransactionOnError === false) {
      options.push('set xact_abort off');
    }

    return options.join('\n');
  }
  /**
   * @private
   */


  processedInitialSql() {
    this.clearConnectTimer();
    this.emit('connect');
  }
  /**
   * Execute the SQL batch represented by [[Request]].
   * There is no param support, and unlike [[Request.execSql]],
   * it is not likely that SQL Server will reuse the execution plan it generates for the SQL.
   *
   * In almost all cases, [[Request.execSql]] will be a better choice.
   *
   * @param request A [[Request]] object representing the request.
   */


  execSqlBatch(request) {
    this.makeRequest(request, _packet.TYPE.SQL_BATCH, new _sqlbatchPayload.default(request.sqlTextOrProcedure, this.currentTransactionDescriptor(), this.config.options));
  }
  /**
   *  Execute the SQL represented by [[Request]].
   *
   * As `sp_executesql` is used to execute the SQL, if the same SQL is executed multiples times
   * using this function, the SQL Server query optimizer is likely to reuse the execution plan it generates
   * for the first execution. This may also result in SQL server treating the request like a stored procedure
   * which can result in the [[Event_doneInProc]] or [[Event_doneProc]] events being emitted instead of the
   * [[Event_done]] event you might expect. Using [[execSqlBatch]] will prevent this from occurring but may have a negative performance impact.
   *
   * Beware of the way that scoping rules apply, and how they may [affect local temp tables](http://weblogs.sqlteam.com/mladenp/archive/2006/11/03/17197.aspx)
   * If you're running in to scoping issues, then [[execSqlBatch]] may be a better choice.
   * See also [issue #24](https://github.com/pekim/tedious/issues/24)
   *
   * @param request A [[Request]] object representing the request.
   */


  execSql(request) {
    try {
      request.validateParameters(this.databaseCollation);
    } catch (error) {
      request.error = error;
      process.nextTick(() => {
        this.debug.log(error.message);
        request.callback(error);
      });
      return;
    }

    const parameters = [];
    parameters.push({
      type: _dataType.TYPES.NVarChar,
      name: 'statement',
      value: request.sqlTextOrProcedure,
      output: false,
      length: undefined,
      precision: undefined,
      scale: undefined
    });

    if (request.parameters.length) {
      parameters.push({
        type: _dataType.TYPES.NVarChar,
        name: 'params',
        value: request.makeParamsParameter(request.parameters),
        output: false,
        length: undefined,
        precision: undefined,
        scale: undefined
      });
      parameters.push(...request.parameters);
    }

    this.makeRequest(request, _packet.TYPE.RPC_REQUEST, new _rpcrequestPayload.default('sp_executesql', parameters, this.currentTransactionDescriptor(), this.config.options, this.databaseCollation));
  }
  /**
   * Creates a new BulkLoad instance.
   *
   * @param table The name of the table to bulk-insert into.
   * @param options A set of bulk load options.
   */


  newBulkLoad(table, callbackOrOptions, callback) {
    let options;

    if (callback === undefined) {
      callback = callbackOrOptions;
      options = {};
    } else {
      options = callbackOrOptions;
    }

    if (typeof options !== 'object') {
      throw new TypeError('"options" argument must be an object');
    }

    return new _bulkLoad.default(table, this.databaseCollation, this.config.options, options, callback);
  }
  /**
   * Execute a [[BulkLoad]].
   *
   * ```js
   * // We want to perform a bulk load into a table with the following format:
   * // CREATE TABLE employees (first_name nvarchar(255), last_name nvarchar(255), day_of_birth date);
   *
   * const bulkLoad = connection.newBulkLoad('employees', (err, rowCount) => {
   *   // ...
   * });
   *
   * // First, we need to specify the columns that we want to write to,
   * // and their definitions. These definitions must match the actual table,
   * // otherwise the bulk load will fail.
   * bulkLoad.addColumn('first_name', TYPES.NVarchar, { nullable: false });
   * bulkLoad.addColumn('last_name', TYPES.NVarchar, { nullable: false });
   * bulkLoad.addColumn('date_of_birth', TYPES.Date, { nullable: false });
   *
   * // Execute a bulk load with a predefined list of rows.
   * //
   * // Note that these rows are held in memory until the
   * // bulk load was performed, so if you need to write a large
   * // number of rows (e.g. by reading from a CSV file),
   * // passing an `AsyncIterable` is advisable to keep memory usage low.
   * connection.execBulkLoad(bulkLoad, [
   *   { 'first_name': 'Steve', 'last_name': 'Jobs', 'day_of_birth': new Date('02-24-1955') },
   *   { 'first_name': 'Bill', 'last_name': 'Gates', 'day_of_birth': new Date('10-28-1955') }
   * ]);
   * ```
   *
   * @param bulkLoad A previously created [[BulkLoad]].
   * @param rows A [[Iterable]] or [[AsyncIterable]] that contains the rows that should be bulk loaded.
   */


  execBulkLoad(bulkLoad, rows) {
    bulkLoad.executionStarted = true;

    if (rows) {
      if (bulkLoad.streamingMode) {
        throw new Error("Connection.execBulkLoad can't be called with a BulkLoad that was put in streaming mode.");
      }

      if (bulkLoad.firstRowWritten) {
        throw new Error("Connection.execBulkLoad can't be called with a BulkLoad that already has rows written to it.");
      }

      const rowStream = _stream.Readable.from(rows); // Destroy the packet transform if an error happens in the row stream,
      // e.g. if an error is thrown from within a generator or stream.


      rowStream.on('error', err => {
        bulkLoad.rowToPacketTransform.destroy(err);
      }); // Destroy the row stream if an error happens in the packet transform,
      // e.g. if the bulk load is cancelled.

      bulkLoad.rowToPacketTransform.on('error', err => {
        rowStream.destroy(err);
      });
      rowStream.pipe(bulkLoad.rowToPacketTransform);
    } else if (!bulkLoad.streamingMode) {
      // If the bulkload was not put into streaming mode by the user,
      // we end the rowToPacketTransform here for them.
      //
      // If it was put into streaming mode, it's the user's responsibility
      // to end the stream.
      bulkLoad.rowToPacketTransform.end();
    }

    const onCancel = () => {
      request.cancel();
    };

    const payload = new _bulkLoadPayload.BulkLoadPayload(bulkLoad);
    const request = new _request.default(bulkLoad.getBulkInsertSql(), error => {
      bulkLoad.removeListener('cancel', onCancel);

      if (error) {
        if (error.code === 'UNKNOWN') {
          error.message += ' This is likely because the schema of the BulkLoad does not match the schema of the table you are attempting to insert into.';
        }

        bulkLoad.error = error;
        bulkLoad.callback(error);
        return;
      }

      this.makeRequest(bulkLoad, _packet.TYPE.BULK_LOAD, payload);
    });
    bulkLoad.once('cancel', onCancel);
    this.execSqlBatch(request);
  }
  /**
   * Prepare the SQL represented by the request.
   *
   * The request can then be used in subsequent calls to
   * [[execute]] and [[unprepare]]
   *
   * @param request A [[Request]] object representing the request.
   *   Parameters only require a name and type. Parameter values are ignored.
   */


  prepare(request) {
    const parameters = [];
    parameters.push({
      type: _dataType.TYPES.Int,
      name: 'handle',
      value: undefined,
      output: true,
      length: undefined,
      precision: undefined,
      scale: undefined
    });
    parameters.push({
      type: _dataType.TYPES.NVarChar,
      name: 'params',
      value: request.parameters.length ? request.makeParamsParameter(request.parameters) : null,
      output: false,
      length: undefined,
      precision: undefined,
      scale: undefined
    });
    parameters.push({
      type: _dataType.TYPES.NVarChar,
      name: 'stmt',
      value: request.sqlTextOrProcedure,
      output: false,
      length: undefined,
      precision: undefined,
      scale: undefined
    });
    request.preparing = true; // TODO: We need to clean up this event handler, otherwise this leaks memory

    request.on('returnValue', (name, value) => {
      if (name === 'handle') {
        request.handle = value;
      } else {
        request.error = new _errors.RequestError(`Tedious > Unexpected output parameter ${name} from sp_prepare`);
      }
    });
    this.makeRequest(request, _packet.TYPE.RPC_REQUEST, new _rpcrequestPayload.default('sp_prepare', parameters, this.currentTransactionDescriptor(), this.config.options, this.databaseCollation));
  }
  /**
   * Release the SQL Server resources associated with a previously prepared request.
   *
   * @param request A [[Request]] object representing the request.
   *   Parameters only require a name and type.
   *   Parameter values are ignored.
   */


  unprepare(request) {
    const parameters = [];
    parameters.push({
      type: _dataType.TYPES.Int,
      name: 'handle',
      // TODO: Abort if `request.handle` is not set
      value: request.handle,
      output: false,
      length: undefined,
      precision: undefined,
      scale: undefined
    });
    this.makeRequest(request, _packet.TYPE.RPC_REQUEST, new _rpcrequestPayload.default('sp_unprepare', parameters, this.currentTransactionDescriptor(), this.config.options, this.databaseCollation));
  }
  /**
   * Execute previously prepared SQL, using the supplied parameters.
   *
   * @param request A previously prepared [[Request]].
   * @param parameters  An object whose names correspond to the names of
   *   parameters that were added to the [[Request]] before it was prepared.
   *   The object's values are passed as the parameters' values when the
   *   request is executed.
   */


  execute(request, parameters) {
    const executeParameters = [];
    executeParameters.push({
      type: _dataType.TYPES.Int,
      name: 'handle',
      // TODO: Abort if `request.handle` is not set
      value: request.handle,
      output: false,
      length: undefined,
      precision: undefined,
      scale: undefined
    });

    try {
      for (let i = 0, len = request.parameters.length; i < len; i++) {
        const parameter = request.parameters[i];
        executeParameters.push({ ...parameter,
          value: parameter.type.validate(parameters ? parameters[parameter.name] : null, this.databaseCollation)
        });
      }
    } catch (error) {
      request.error = error;
      process.nextTick(() => {
        this.debug.log(error.message);
        request.callback(error);
      });
      return;
    }

    this.makeRequest(request, _packet.TYPE.RPC_REQUEST, new _rpcrequestPayload.default('sp_execute', executeParameters, this.currentTransactionDescriptor(), this.config.options, this.databaseCollation));
  }
  /**
   * Call a stored procedure represented by [[Request]].
   *
   * @param request A [[Request]] object representing the request.
   */


  callProcedure(request) {
    try {
      request.validateParameters(this.databaseCollation);
    } catch (error) {
      request.error = error;
      process.nextTick(() => {
        this.debug.log(error.message);
        request.callback(error);
      });
      return;
    }

    this.makeRequest(request, _packet.TYPE.RPC_REQUEST, new _rpcrequestPayload.default(request.sqlTextOrProcedure, request.parameters, this.currentTransactionDescriptor(), this.config.options, this.databaseCollation));
  }
  /**
   * Start a transaction.
   *
   * @param callback
   * @param name A string representing a name to associate with the transaction.
   *   Optional, and defaults to an empty string. Required when `isolationLevel`
   *   is present.
   * @param isolationLevel The isolation level that the transaction is to be run with.
   *
   *   The isolation levels are available from `require('tedious').ISOLATION_LEVEL`.
   *   * `READ_UNCOMMITTED`
   *   * `READ_COMMITTED`
   *   * `REPEATABLE_READ`
   *   * `SERIALIZABLE`
   *   * `SNAPSHOT`
   *
   *   Optional, and defaults to the Connection's isolation level.
   */


  beginTransaction(callback, name = '', isolationLevel = this.config.options.isolationLevel) {
    (0, _transaction.assertValidIsolationLevel)(isolationLevel, 'isolationLevel');
    const transaction = new _transaction.Transaction(name, isolationLevel);

    if (this.config.options.tdsVersion < '7_2') {
      return this.execSqlBatch(new _request.default('SET TRANSACTION ISOLATION LEVEL ' + transaction.isolationLevelToTSQL() + ';BEGIN TRAN ' + transaction.name, err => {
        this.transactionDepth++;

        if (this.transactionDepth === 1) {
          this.inTransaction = true;
        }

        callback(err);
      }));
    }

    const request = new _request.default(undefined, err => {
      return callback(err, this.currentTransactionDescriptor());
    });
    return this.makeRequest(request, _packet.TYPE.TRANSACTION_MANAGER, transaction.beginPayload(this.currentTransactionDescriptor()));
  }
  /**
   * Commit a transaction.
   *
   * There should be an active transaction - that is, [[beginTransaction]]
   * should have been previously called.
   *
   * @param callback
   * @param name A string representing a name to associate with the transaction.
   *   Optional, and defaults to an empty string. Required when `isolationLevel`is present.
   */


  commitTransaction(callback, name = '') {
    const transaction = new _transaction.Transaction(name);

    if (this.config.options.tdsVersion < '7_2') {
      return this.execSqlBatch(new _request.default('COMMIT TRAN ' + transaction.name, err => {
        this.transactionDepth--;

        if (this.transactionDepth === 0) {
          this.inTransaction = false;
        }

        callback(err);
      }));
    }

    const request = new _request.default(undefined, callback);
    return this.makeRequest(request, _packet.TYPE.TRANSACTION_MANAGER, transaction.commitPayload(this.currentTransactionDescriptor()));
  }
  /**
   * Rollback a transaction.
   *
   * There should be an active transaction - that is, [[beginTransaction]]
   * should have been previously called.
   *
   * @param callback
   * @param name A string representing a name to associate with the transaction.
   *   Optional, and defaults to an empty string.
   *   Required when `isolationLevel` is present.
   */


  rollbackTransaction(callback, name = '') {
    const transaction = new _transaction.Transaction(name);

    if (this.config.options.tdsVersion < '7_2') {
      return this.execSqlBatch(new _request.default('ROLLBACK TRAN ' + transaction.name, err => {
        this.transactionDepth--;

        if (this.transactionDepth === 0) {
          this.inTransaction = false;
        }

        callback(err);
      }));
    }

    const request = new _request.default(undefined, callback);
    return this.makeRequest(request, _packet.TYPE.TRANSACTION_MANAGER, transaction.rollbackPayload(this.currentTransactionDescriptor()));
  }
  /**
   * Set a savepoint within a transaction.
   *
   * There should be an active transaction - that is, [[beginTransaction]]
   * should have been previously called.
   *
   * @param callback
   * @param name A string representing a name to associate with the transaction.\
   *   Optional, and defaults to an empty string.
   *   Required when `isolationLevel` is present.
   */


  saveTransaction(callback, name) {
    const transaction = new _transaction.Transaction(name);

    if (this.config.options.tdsVersion < '7_2') {
      return this.execSqlBatch(new _request.default('SAVE TRAN ' + transaction.name, err => {
        this.transactionDepth++;
        callback(err);
      }));
    }

    const request = new _request.default(undefined, callback);
    return this.makeRequest(request, _packet.TYPE.TRANSACTION_MANAGER, transaction.savePayload(this.currentTransactionDescriptor()));
  }
  /**
   * Run the given callback after starting a transaction, and commit or
   * rollback the transaction afterwards.
   *
   * This is a helper that employs [[beginTransaction]], [[commitTransaction]],
   * [[rollbackTransaction]], and [[saveTransaction]] to greatly simplify the
   * use of database transactions and automatically handle transaction nesting.
   *
   * @param cb
   * @param isolationLevel
   *   The isolation level that the transaction is to be run with.
   *
   *   The isolation levels are available from `require('tedious').ISOLATION_LEVEL`.
   *   * `READ_UNCOMMITTED`
   *   * `READ_COMMITTED`
   *   * `REPEATABLE_READ`
   *   * `SERIALIZABLE`
   *   * `SNAPSHOT`
   *
   *   Optional, and defaults to the Connection's isolation level.
   */


  transaction(cb, isolationLevel) {
    if (typeof cb !== 'function') {
      throw new TypeError('`cb` must be a function');
    }

    const useSavepoint = this.inTransaction;

    const name = '_tedious_' + _crypto.default.randomBytes(10).toString('hex');

    const txDone = (err, done, ...args) => {
      if (err) {
        if (this.inTransaction && this.state === this.STATE.LOGGED_IN) {
          this.rollbackTransaction(txErr => {
            done(txErr || err, ...args);
          }, name);
        } else {
          done(err, ...args);
        }
      } else if (useSavepoint) {
        if (this.config.options.tdsVersion < '7_2') {
          this.transactionDepth--;
        }

        done(null, ...args);
      } else {
        this.commitTransaction(txErr => {
          done(txErr, ...args);
        }, name);
      }
    };

    if (useSavepoint) {
      return this.saveTransaction(err => {
        if (err) {
          return cb(err);
        }

        if (isolationLevel) {
          return this.execSqlBatch(new _request.default('SET transaction isolation level ' + this.getIsolationLevelText(isolationLevel), err => {
            return cb(err, txDone);
          }));
        } else {
          return cb(null, txDone);
        }
      }, name);
    } else {
      return this.beginTransaction(err => {
        if (err) {
          return cb(err);
        }

        return cb(null, txDone);
      }, name, isolationLevel);
    }
  }
  /**
   * @private
   */


  makeRequest(request, packetType, payload) {
    if (this.state !== this.STATE.LOGGED_IN) {
      const message = 'Requests can only be made in the ' + this.STATE.LOGGED_IN.name + ' state, not the ' + this.state.name + ' state';
      this.debug.log(message);
      request.callback(new _errors.RequestError(message, 'EINVALIDSTATE'));
    } else if (request.canceled) {
      process.nextTick(() => {
        request.callback(new _errors.RequestError('Canceled.', 'ECANCEL'));
      });
    } else {
      if (packetType === _packet.TYPE.SQL_BATCH) {
        this.isSqlBatch = true;
      } else {
        this.isSqlBatch = false;
      }

      this.request = request;
      request.connection = this;
      request.rowCount = 0;
      request.rows = [];
      request.rst = [];

      const onCancel = () => {
        payloadStream.unpipe(message);
        payloadStream.destroy(new _errors.RequestError('Canceled.', 'ECANCEL')); // set the ignore bit and end the message.

        message.ignore = true;
        message.end();

        if (request instanceof _request.default && request.paused) {
          // resume the request if it was paused so we can read the remaining tokens
          request.resume();
        }
      };

      request.once('cancel', onCancel);
      this.createRequestTimer();
      const message = new _message.default({
        type: packetType,
        resetConnection: this.resetConnectionOnNextRequest
      });
      this.messageIo.outgoingMessageStream.write(message);
      this.transitionTo(this.STATE.SENT_CLIENT_REQUEST);
      message.once('finish', () => {
        request.removeListener('cancel', onCancel);
        request.once('cancel', this._cancelAfterRequestSent);
        this.resetConnectionOnNextRequest = false;
        this.debug.payload(function () {
          return payload.toString('  ');
        });
      });

      const payloadStream = _stream.Readable.from(payload);

      payloadStream.once('error', error => {
        payloadStream.unpipe(message); // Only set a request error if no error was set yet.

        request.error ??= error;
        message.ignore = true;
        message.end();
      });
      payloadStream.pipe(message);
    }
  }
  /**
   * Cancel currently executed request.
   */


  cancel() {
    if (!this.request) {
      return false;
    }

    if (this.request.canceled) {
      return false;
    }

    this.request.cancel();
    return true;
  }
  /**
   * Reset the connection to its initial state.
   * Can be useful for connection pool implementations.
   *
   * @param callback
   */


  reset(callback) {
    const request = new _request.default(this.getInitialSql(), err => {
      if (this.config.options.tdsVersion < '7_2') {
        this.inTransaction = false;
      }

      callback(err);
    });
    this.resetConnectionOnNextRequest = true;
    this.execSqlBatch(request);
  }
  /**
   * @private
   */


  currentTransactionDescriptor() {
    return this.transactionDescriptors[this.transactionDescriptors.length - 1];
  }
  /**
   * @private
   */


  getIsolationLevelText(isolationLevel) {
    switch (isolationLevel) {
      case _transaction.ISOLATION_LEVEL.READ_UNCOMMITTED:
        return 'read uncommitted';

      case _transaction.ISOLATION_LEVEL.REPEATABLE_READ:
        return 'repeatable read';

      case _transaction.ISOLATION_LEVEL.SERIALIZABLE:
        return 'serializable';

      case _transaction.ISOLATION_LEVEL.SNAPSHOT:
        return 'snapshot';

      default:
        return 'read committed';
    }
  }

}

function isTransientError(error) {
  if (error instanceof _esAggregateError.default) {
    error = error.errors[0];
  }

  return error instanceof _errors.ConnectionError && !!error.isTransient;
}

var _default = Connection;
exports.default = _default;
module.exports = Connection;
Connection.prototype.STATE = {
  INITIALIZED: {
    name: 'Initialized',
    events: {}
  },
  CONNECTING: {
    name: 'Connecting',
    enter: function () {
      this.initialiseConnection();
    },
    events: {
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      }
    }
  },
  SENT_PRELOGIN: {
    name: 'SentPrelogin',
    enter: function () {
      (async () => {
        let messageBuffer = Buffer.alloc(0);
        let message;

        try {
          message = await this.messageIo.readMessage();
        } catch (err) {
          return this.socketError(err);
        }

        for await (const data of message) {
          messageBuffer = Buffer.concat([messageBuffer, data]);
        }

        const preloginPayload = new _preloginPayload.default(messageBuffer);
        this.debug.payload(function () {
          return preloginPayload.toString('  ');
        });

        if (preloginPayload.fedAuthRequired === 1) {
          this.fedAuthRequired = true;
        }

        if (preloginPayload.encryptionString === 'ON' || preloginPayload.encryptionString === 'REQ') {
          if (!this.config.options.encrypt) {
            this.emit('connect', new _errors.ConnectionError("Server requires encryption, set 'encrypt' config option to true.", 'EENCRYPT'));
            return this.close();
          }

          try {
            var _this$routingData;

            this.transitionTo(this.STATE.SENT_TLSSSLNEGOTIATION);
            await this.messageIo.startTls(this.secureContextOptions, ((_this$routingData = this.routingData) === null || _this$routingData === void 0 ? void 0 : _this$routingData.server) ?? this.config.server, this.config.options.trustServerCertificate);
          } catch (err) {
            return this.socketError(err);
          }
        }

        this.sendLogin7Packet();
        const {
          authentication
        } = this.config;

        switch (authentication.type) {
          case 'azure-active-directory-password':
          case 'azure-active-directory-msi-vm':
          case 'azure-active-directory-msi-app-service':
          case 'azure-active-directory-service-principal-secret':
          case 'azure-active-directory-default':
            this.transitionTo(this.STATE.SENT_LOGIN7_WITH_FEDAUTH);
            break;

          case 'ntlm':
            this.transitionTo(this.STATE.SENT_LOGIN7_WITH_NTLM);
            break;

          default:
            this.transitionTo(this.STATE.SENT_LOGIN7_WITH_STANDARD_LOGIN);
            break;
        }
      })().catch(err => {
        process.nextTick(() => {
          throw err;
        });
      });
    },
    events: {
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      }
    }
  },
  REROUTING: {
    name: 'ReRouting',
    enter: function () {
      this.cleanupConnection(CLEANUP_TYPE.REDIRECT);
    },
    events: {
      message: function () {},
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      reconnect: function () {
        this.transitionTo(this.STATE.CONNECTING);
      }
    }
  },
  TRANSIENT_FAILURE_RETRY: {
    name: 'TRANSIENT_FAILURE_RETRY',
    enter: function () {
      this.curTransientRetryCount++;
      this.cleanupConnection(CLEANUP_TYPE.RETRY);
    },
    events: {
      message: function () {},
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      retry: function () {
        this.createRetryTimer();
      }
    }
  },
  SENT_TLSSSLNEGOTIATION: {
    name: 'SentTLSSSLNegotiation',
    events: {
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      }
    }
  },
  SENT_LOGIN7_WITH_STANDARD_LOGIN: {
    name: 'SentLogin7WithStandardLogin',
    enter: function () {
      (async () => {
        let message;

        try {
          message = await this.messageIo.readMessage();
        } catch (err) {
          return this.socketError(err);
        }

        const handler = new _handler.Login7TokenHandler(this);
        const tokenStreamParser = this.createTokenStreamParser(message, handler);
        await (0, _events.once)(tokenStreamParser, 'end');

        if (handler.loginAckReceived) {
          if (handler.routingData) {
            this.routingData = handler.routingData;
            this.transitionTo(this.STATE.REROUTING);
          } else {
            this.transitionTo(this.STATE.LOGGED_IN_SENDING_INITIAL_SQL);
          }
        } else if (this.loginError) {
          if (isTransientError(this.loginError)) {
            this.debug.log('Initiating retry on transient error');
            this.transitionTo(this.STATE.TRANSIENT_FAILURE_RETRY);
          } else {
            this.emit('connect', this.loginError);
            this.transitionTo(this.STATE.FINAL);
          }
        } else {
          this.emit('connect', new _errors.ConnectionError('Login failed.', 'ELOGIN'));
          this.transitionTo(this.STATE.FINAL);
        }
      })().catch(err => {
        process.nextTick(() => {
          throw err;
        });
      });
    },
    events: {
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      }
    }
  },
  SENT_LOGIN7_WITH_NTLM: {
    name: 'SentLogin7WithNTLMLogin',
    enter: function () {
      (async () => {
        while (true) {
          let message;

          try {
            message = await this.messageIo.readMessage();
          } catch (err) {
            return this.socketError(err);
          }

          const handler = new _handler.Login7TokenHandler(this);
          const tokenStreamParser = this.createTokenStreamParser(message, handler);
          await (0, _events.once)(tokenStreamParser, 'end');

          if (handler.loginAckReceived) {
            if (handler.routingData) {
              this.routingData = handler.routingData;
              return this.transitionTo(this.STATE.REROUTING);
            } else {
              return this.transitionTo(this.STATE.LOGGED_IN_SENDING_INITIAL_SQL);
            }
          } else if (this.ntlmpacket) {
            const authentication = this.config.authentication;
            const payload = new _ntlmPayload.default({
              domain: authentication.options.domain,
              userName: authentication.options.userName,
              password: authentication.options.password,
              ntlmpacket: this.ntlmpacket
            });
            this.messageIo.sendMessage(_packet.TYPE.NTLMAUTH_PKT, payload.data);
            this.debug.payload(function () {
              return payload.toString('  ');
            });
            this.ntlmpacket = undefined;
          } else if (this.loginError) {
            if (isTransientError(this.loginError)) {
              this.debug.log('Initiating retry on transient error');
              return this.transitionTo(this.STATE.TRANSIENT_FAILURE_RETRY);
            } else {
              this.emit('connect', this.loginError);
              return this.transitionTo(this.STATE.FINAL);
            }
          } else {
            this.emit('connect', new _errors.ConnectionError('Login failed.', 'ELOGIN'));
            return this.transitionTo(this.STATE.FINAL);
          }
        }
      })().catch(err => {
        process.nextTick(() => {
          throw err;
        });
      });
    },
    events: {
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      }
    }
  },
  SENT_LOGIN7_WITH_FEDAUTH: {
    name: 'SentLogin7Withfedauth',
    enter: function () {
      (async () => {
        let message;

        try {
          message = await this.messageIo.readMessage();
        } catch (err) {
          return this.socketError(err);
        }

        const handler = new _handler.Login7TokenHandler(this);
        const tokenStreamParser = this.createTokenStreamParser(message, handler);
        await (0, _events.once)(tokenStreamParser, 'end');

        if (handler.loginAckReceived) {
          if (handler.routingData) {
            this.routingData = handler.routingData;
            this.transitionTo(this.STATE.REROUTING);
          } else {
            this.transitionTo(this.STATE.LOGGED_IN_SENDING_INITIAL_SQL);
          }

          return;
        }

        const fedAuthInfoToken = handler.fedAuthInfoToken;

        if (fedAuthInfoToken && fedAuthInfoToken.stsurl && fedAuthInfoToken.spn) {
          const authentication = this.config.authentication;
          const tokenScope = new _url.URL('/.default', fedAuthInfoToken.spn).toString();
          let credentials;

          switch (authentication.type) {
            case 'azure-active-directory-password':
              credentials = new _identity.UsernamePasswordCredential(authentication.options.tenantId ?? 'common', authentication.options.clientId, authentication.options.userName, authentication.options.password);
              break;

            case 'azure-active-directory-msi-vm':
            case 'azure-active-directory-msi-app-service':
              const msiArgs = authentication.options.clientId ? [authentication.options.clientId, {}] : [{}];
              credentials = new _identity.ManagedIdentityCredential(...msiArgs);
              break;

            case 'azure-active-directory-default':
              const args = authentication.options.clientId ? {
                managedIdentityClientId: authentication.options.clientId
              } : {};
              credentials = new _identity.DefaultAzureCredential(args);
              break;

            case 'azure-active-directory-service-principal-secret':
              credentials = new _identity.ClientSecretCredential(authentication.options.tenantId, authentication.options.clientId, authentication.options.clientSecret);
              break;
          }

          let tokenResponse;

          try {
            tokenResponse = await credentials.getToken(tokenScope);
          } catch (err) {
            this.loginError = new _esAggregateError.default([new _errors.ConnectionError('Security token could not be authenticated or authorized.', 'EFEDAUTH'), err]);
            this.emit('connect', this.loginError);
            this.transitionTo(this.STATE.FINAL);
            return;
          }

          const token = tokenResponse.token;
          this.sendFedAuthTokenMessage(token);
        } else if (this.loginError) {
          if (isTransientError(this.loginError)) {
            this.debug.log('Initiating retry on transient error');
            this.transitionTo(this.STATE.TRANSIENT_FAILURE_RETRY);
          } else {
            this.emit('connect', this.loginError);
            this.transitionTo(this.STATE.FINAL);
          }
        } else {
          this.emit('connect', new _errors.ConnectionError('Login failed.', 'ELOGIN'));
          this.transitionTo(this.STATE.FINAL);
        }
      })().catch(err => {
        process.nextTick(() => {
          throw err;
        });
      });
    },
    events: {
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      }
    }
  },
  LOGGED_IN_SENDING_INITIAL_SQL: {
    name: 'LoggedInSendingInitialSql',
    enter: function () {
      (async () => {
        this.sendInitialSql();
        let message;

        try {
          message = await this.messageIo.readMessage();
        } catch (err) {
          return this.socketError(err);
        }

        const tokenStreamParser = this.createTokenStreamParser(message, new _handler.InitialSqlTokenHandler(this));
        await (0, _events.once)(tokenStreamParser, 'end');
        this.transitionTo(this.STATE.LOGGED_IN);
        this.processedInitialSql();
      })().catch(err => {
        process.nextTick(() => {
          throw err;
        });
      });
    },
    events: {
      socketError: function socketError() {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      }
    }
  },
  LOGGED_IN: {
    name: 'LoggedIn',
    events: {
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      }
    }
  },
  SENT_CLIENT_REQUEST: {
    name: 'SentClientRequest',
    enter: function () {
      (async () => {
        var _this$request, _this$request3, _this$request10;

        let message;

        try {
          message = await this.messageIo.readMessage();
        } catch (err) {
          return this.socketError(err);
        } // request timer is stopped on first data package


        this.clearRequestTimer();
        const tokenStreamParser = this.createTokenStreamParser(message, new _handler.RequestTokenHandler(this, this.request)); // If the request was canceled and we have a `cancelTimer`
        // defined, we send a attention message after the
        // request message was fully sent off.
        //
        // We already started consuming the current message
        // (but all the token handlers should be no-ops), and
        // need to ensure the next message is handled by the
        // `SENT_ATTENTION` state.

        if ((_this$request = this.request) !== null && _this$request !== void 0 && _this$request.canceled && this.cancelTimer) {
          return this.transitionTo(this.STATE.SENT_ATTENTION);
        }

        const onResume = () => {
          tokenStreamParser.resume();
        };

        const onPause = () => {
          var _this$request2;

          tokenStreamParser.pause();
          (_this$request2 = this.request) === null || _this$request2 === void 0 ? void 0 : _this$request2.once('resume', onResume);
        };

        (_this$request3 = this.request) === null || _this$request3 === void 0 ? void 0 : _this$request3.on('pause', onPause);

        if (this.request instanceof _request.default && this.request.paused) {
          onPause();
        }

        const onCancel = () => {
          var _this$request4, _this$request5;

          tokenStreamParser.removeListener('end', onEndOfMessage);

          if (this.request instanceof _request.default && this.request.paused) {
            // resume the request if it was paused so we can read the remaining tokens
            this.request.resume();
          }

          (_this$request4 = this.request) === null || _this$request4 === void 0 ? void 0 : _this$request4.removeListener('pause', onPause);
          (_this$request5 = this.request) === null || _this$request5 === void 0 ? void 0 : _this$request5.removeListener('resume', onResume); // The `_cancelAfterRequestSent` callback will have sent a
          // attention message, so now we need to also switch to
          // the `SENT_ATTENTION` state to make sure the attention ack
          // message is processed correctly.

          this.transitionTo(this.STATE.SENT_ATTENTION);
        };

        const onEndOfMessage = () => {
          var _this$request6, _this$request7, _this$request8, _this$request9;

          (_this$request6 = this.request) === null || _this$request6 === void 0 ? void 0 : _this$request6.removeListener('cancel', this._cancelAfterRequestSent);
          (_this$request7 = this.request) === null || _this$request7 === void 0 ? void 0 : _this$request7.removeListener('cancel', onCancel);
          (_this$request8 = this.request) === null || _this$request8 === void 0 ? void 0 : _this$request8.removeListener('pause', onPause);
          (_this$request9 = this.request) === null || _this$request9 === void 0 ? void 0 : _this$request9.removeListener('resume', onResume);
          this.transitionTo(this.STATE.LOGGED_IN);
          const sqlRequest = this.request;
          this.request = undefined;

          if (this.config.options.tdsVersion < '7_2' && sqlRequest.error && this.isSqlBatch) {
            this.inTransaction = false;
          }

          sqlRequest.callback(sqlRequest.error, sqlRequest.rowCount, sqlRequest.rows);
        };

        tokenStreamParser.once('end', onEndOfMessage);
        (_this$request10 = this.request) === null || _this$request10 === void 0 ? void 0 : _this$request10.once('cancel', onCancel);
      })();
    },
    exit: function (nextState) {
      this.clearRequestTimer();
    },
    events: {
      socketError: function (err) {
        const sqlRequest = this.request;
        this.request = undefined;
        this.transitionTo(this.STATE.FINAL);
        sqlRequest.callback(err);
      }
    }
  },
  SENT_ATTENTION: {
    name: 'SentAttention',
    enter: function () {
      (async () => {
        let message;

        try {
          message = await this.messageIo.readMessage();
        } catch (err) {
          return this.socketError(err);
        }

        const handler = new _handler.AttentionTokenHandler(this, this.request);
        const tokenStreamParser = this.createTokenStreamParser(message, handler);
        await (0, _events.once)(tokenStreamParser, 'end'); // 3.2.5.7 Sent Attention State
        // Discard any data contained in the response, until we receive the attention response

        if (handler.attentionReceived) {
          this.clearCancelTimer();
          const sqlRequest = this.request;
          this.request = undefined;
          this.transitionTo(this.STATE.LOGGED_IN);

          if (sqlRequest.error && sqlRequest.error instanceof _errors.RequestError && sqlRequest.error.code === 'ETIMEOUT') {
            sqlRequest.callback(sqlRequest.error);
          } else {
            sqlRequest.callback(new _errors.RequestError('Canceled.', 'ECANCEL'));
          }
        }
      })().catch(err => {
        process.nextTick(() => {
          throw err;
        });
      });
    },
    events: {
      socketError: function (err) {
        const sqlRequest = this.request;
        this.request = undefined;
        this.transitionTo(this.STATE.FINAL);
        sqlRequest.callback(err);
      }
    }
  },
  FINAL: {
    name: 'Final',
    enter: function () {
      this.cleanupConnection(CLEANUP_TYPE.NORMAL);
    },
    events: {
      connectTimeout: function () {// Do nothing, as the timer should be cleaned up.
      },
      message: function () {// Do nothing
      },
      socketError: function () {// Do nothing
      }
    }
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJLRUVQX0FMSVZFX0lOSVRJQUxfREVMQVkiLCJERUZBVUxUX0NPTk5FQ1RfVElNRU9VVCIsIkRFRkFVTFRfQ0xJRU5UX1JFUVVFU1RfVElNRU9VVCIsIkRFRkFVTFRfQ0FOQ0VMX1RJTUVPVVQiLCJERUZBVUxUX0NPTk5FQ1RfUkVUUllfSU5URVJWQUwiLCJERUZBVUxUX1BBQ0tFVF9TSVpFIiwiREVGQVVMVF9URVhUU0laRSIsIkRFRkFVTFRfREFURUZJUlNUIiwiREVGQVVMVF9QT1JUIiwiREVGQVVMVF9URFNfVkVSU0lPTiIsIkRFRkFVTFRfTEFOR1VBR0UiLCJERUZBVUxUX0RBVEVGT1JNQVQiLCJDTEVBTlVQX1RZUEUiLCJOT1JNQUwiLCJSRURJUkVDVCIsIlJFVFJZIiwiQ29ubmVjdGlvbiIsIkV2ZW50RW1pdHRlciIsImNvbnN0cnVjdG9yIiwiY29uZmlnIiwiZmVkQXV0aFJlcXVpcmVkIiwic2VjdXJlQ29udGV4dE9wdGlvbnMiLCJpblRyYW5zYWN0aW9uIiwidHJhbnNhY3Rpb25EZXNjcmlwdG9ycyIsInRyYW5zYWN0aW9uRGVwdGgiLCJpc1NxbEJhdGNoIiwiY3VyVHJhbnNpZW50UmV0cnlDb3VudCIsInRyYW5zaWVudEVycm9yTG9va3VwIiwiY2xvc2VkIiwibG9naW5FcnJvciIsImRlYnVnIiwibnRsbXBhY2tldCIsIm50bG1wYWNrZXRCdWZmZXIiLCJyb3V0aW5nRGF0YSIsIm1lc3NhZ2VJbyIsInN0YXRlIiwicmVzZXRDb25uZWN0aW9uT25OZXh0UmVxdWVzdCIsInJlcXVlc3QiLCJwcm9jUmV0dXJuU3RhdHVzVmFsdWUiLCJzb2NrZXQiLCJtZXNzYWdlQnVmZmVyIiwiY29ubmVjdFRpbWVyIiwiY2FuY2VsVGltZXIiLCJyZXF1ZXN0VGltZXIiLCJyZXRyeVRpbWVyIiwiX2NhbmNlbEFmdGVyUmVxdWVzdFNlbnQiLCJkYXRhYmFzZUNvbGxhdGlvbiIsIlR5cGVFcnJvciIsInNlcnZlciIsImF1dGhlbnRpY2F0aW9uIiwidW5kZWZpbmVkIiwidHlwZSIsIm9wdGlvbnMiLCJkb21haW4iLCJ1c2VyTmFtZSIsInBhc3N3b3JkIiwidG9VcHBlckNhc2UiLCJjbGllbnRJZCIsInRlbmFudElkIiwidG9rZW4iLCJjbGllbnRTZWNyZXQiLCJhYm9ydFRyYW5zYWN0aW9uT25FcnJvciIsImFwcE5hbWUiLCJjYW1lbENhc2VDb2x1bW5zIiwiY2FuY2VsVGltZW91dCIsImNvbHVtbkVuY3J5cHRpb25LZXlDYWNoZVRUTCIsImNvbHVtbkVuY3J5cHRpb25TZXR0aW5nIiwiY29sdW1uTmFtZVJlcGxhY2VyIiwiY29ubmVjdGlvblJldHJ5SW50ZXJ2YWwiLCJjb25uZWN0VGltZW91dCIsImNvbm5lY3RvciIsImNvbm5lY3Rpb25Jc29sYXRpb25MZXZlbCIsIklTT0xBVElPTl9MRVZFTCIsIlJFQURfQ09NTUlUVEVEIiwiY3J5cHRvQ3JlZGVudGlhbHNEZXRhaWxzIiwiZGF0YWJhc2UiLCJkYXRlZmlyc3QiLCJkYXRlRm9ybWF0IiwiZGF0YSIsInBhY2tldCIsInBheWxvYWQiLCJlbmFibGVBbnNpTnVsbCIsImVuYWJsZUFuc2lOdWxsRGVmYXVsdCIsImVuYWJsZUFuc2lQYWRkaW5nIiwiZW5hYmxlQW5zaVdhcm5pbmdzIiwiZW5hYmxlQXJpdGhBYm9ydCIsImVuYWJsZUNvbmNhdE51bGxZaWVsZHNOdWxsIiwiZW5hYmxlQ3Vyc29yQ2xvc2VPbkNvbW1pdCIsImVuYWJsZUltcGxpY2l0VHJhbnNhY3Rpb25zIiwiZW5hYmxlTnVtZXJpY1JvdW5kYWJvcnQiLCJlbmFibGVRdW90ZWRJZGVudGlmaWVyIiwiZW5jcnlwdCIsImZhbGxiYWNrVG9EZWZhdWx0RGIiLCJlbmNyeXB0aW9uS2V5U3RvcmVQcm92aWRlcnMiLCJpbnN0YW5jZU5hbWUiLCJpc29sYXRpb25MZXZlbCIsImxhbmd1YWdlIiwibG9jYWxBZGRyZXNzIiwibWF4UmV0cmllc09uVHJhbnNpZW50RXJyb3JzIiwibXVsdGlTdWJuZXRGYWlsb3ZlciIsInBhY2tldFNpemUiLCJwb3J0IiwicmVhZE9ubHlJbnRlbnQiLCJyZXF1ZXN0VGltZW91dCIsInJvd0NvbGxlY3Rpb25PbkRvbmUiLCJyb3dDb2xsZWN0aW9uT25SZXF1ZXN0Q29tcGxldGlvbiIsInNlcnZlck5hbWUiLCJzZXJ2ZXJTdXBwb3J0c0NvbHVtbkVuY3J5cHRpb24iLCJ0ZHNWZXJzaW9uIiwidGV4dHNpemUiLCJ0cnVzdGVkU2VydmVyTmFtZUFFIiwidHJ1c3RTZXJ2ZXJDZXJ0aWZpY2F0ZSIsInVzZUNvbHVtbk5hbWVzIiwidXNlVVRDIiwid29ya3N0YXRpb25JZCIsImxvd2VyQ2FzZUd1aWRzIiwiRXJyb3IiLCJSYW5nZUVycm9yIiwic2VjdXJlT3B0aW9ucyIsIk9iamVjdCIsImNyZWF0ZSIsInZhbHVlIiwiY29uc3RhbnRzIiwiU1NMX09QX0RPTlRfSU5TRVJUX0VNUFRZX0ZSQUdNRU5UUyIsImNyZWF0ZURlYnVnIiwiQnVmZmVyIiwiZnJvbSIsImFsbG9jIiwiVHJhbnNpZW50RXJyb3JMb29rdXAiLCJTVEFURSIsIklOSVRJQUxJWkVEIiwic2VuZE1lc3NhZ2UiLCJUWVBFIiwiQVRURU5USU9OIiwiY3JlYXRlQ2FuY2VsVGltZXIiLCJjb25uZWN0IiwiY29ubmVjdExpc3RlbmVyIiwiQ29ubmVjdGlvbkVycm9yIiwibmFtZSIsIm9uQ29ubmVjdCIsImVyciIsInJlbW92ZUxpc3RlbmVyIiwib25FcnJvciIsIm9uY2UiLCJ0cmFuc2l0aW9uVG8iLCJDT05ORUNUSU5HIiwib24iLCJldmVudCIsImxpc3RlbmVyIiwiZW1pdCIsImFyZ3MiLCJjbG9zZSIsIkZJTkFMIiwiaW5pdGlhbGlzZUNvbm5lY3Rpb24iLCJzaWduYWwiLCJjcmVhdGVDb25uZWN0VGltZXIiLCJjb25uZWN0T25Qb3J0IiwidGltZW91dCIsInRoZW4iLCJwcm9jZXNzIiwibmV4dFRpY2siLCJjbGVhckNvbm5lY3RUaW1lciIsIm1lc3NhZ2UiLCJjbGVhbnVwQ29ubmVjdGlvbiIsImNsZWFudXBUeXBlIiwiY2xlYXJSZXF1ZXN0VGltZXIiLCJjbGVhclJldHJ5VGltZXIiLCJjbG9zZUNvbm5lY3Rpb24iLCJSZXF1ZXN0RXJyb3IiLCJjYWxsYmFjayIsIkRlYnVnIiwiY3JlYXRlVG9rZW5TdHJlYW1QYXJzZXIiLCJoYW5kbGVyIiwiVG9rZW5TdHJlYW1QYXJzZXIiLCJjdXN0b21Db25uZWN0b3IiLCJjb25uZWN0T3B0cyIsImhvc3QiLCJjb25uZWN0SW5QYXJhbGxlbCIsImNvbm5lY3RJblNlcXVlbmNlIiwiZG5zIiwibG9va3VwIiwiZXJyb3IiLCJzb2NrZXRFcnJvciIsInNvY2tldENsb3NlIiwic29ja2V0RW5kIiwic2V0S2VlcEFsaXZlIiwiTWVzc2FnZUlPIiwiY2xlYXJ0ZXh0IiwibG9nIiwic2VuZFByZUxvZ2luIiwiU0VOVF9QUkVMT0dJTiIsImRlc3Ryb3kiLCJjb250cm9sbGVyIiwiQWJvcnRDb250cm9sbGVyIiwic2V0VGltZW91dCIsImFib3J0IiwiY2xlYXJDYW5jZWxUaW1lciIsImNyZWF0ZVJlcXVlc3RUaW1lciIsImNyZWF0ZVJldHJ5VGltZXIiLCJyZXRyeVRpbWVvdXQiLCJkaXNwYXRjaEV2ZW50IiwiY2FuY2VsIiwiY2xlYXJUaW1lb3V0IiwibmV3U3RhdGUiLCJleGl0IiwiY2FsbCIsImVudGVyIiwiYXBwbHkiLCJnZXRFdmVudEhhbmRsZXIiLCJldmVudE5hbWUiLCJldmVudHMiLCJTRU5UX1RMU1NTTE5FR09USUFUSU9OIiwiY29kZSIsIlJFUk9VVElORyIsIlRSQU5TSUVOVF9GQUlMVVJFX1JFVFJZIiwibWFqb3IiLCJtaW5vciIsImJ1aWxkIiwiZXhlYyIsInZlcnNpb24iLCJQcmVsb2dpblBheWxvYWQiLCJOdW1iZXIiLCJzdWJidWlsZCIsIlBSRUxPR0lOIiwidG9TdHJpbmciLCJzZW5kTG9naW43UGFja2V0IiwiTG9naW43UGF5bG9hZCIsInZlcnNpb25zIiwiY2xpZW50UHJvZ1ZlciIsImNsaWVudFBpZCIsInBpZCIsImNvbm5lY3Rpb25JZCIsImNsaWVudFRpbWVab25lIiwiRGF0ZSIsImdldFRpbWV6b25lT2Zmc2V0IiwiY2xpZW50TGNpZCIsImZlZEF1dGgiLCJlY2hvIiwid29ya2Zsb3ciLCJmZWRBdXRoVG9rZW4iLCJzc3BpIiwiaG9zdG5hbWUiLCJvcyIsImxpYnJhcnlOYW1lIiwiaW5pdERiRmF0YWwiLCJMT0dJTjciLCJ0b0J1ZmZlciIsInNlbmRGZWRBdXRoVG9rZW5NZXNzYWdlIiwiYWNjZXNzVG9rZW5MZW4iLCJieXRlTGVuZ3RoIiwib2Zmc2V0Iiwid3JpdGVVSW50MzJMRSIsIndyaXRlIiwiRkVEQVVUSF9UT0tFTiIsIlNFTlRfTE9HSU43X1dJVEhfU1RBTkRBUkRfTE9HSU4iLCJzZW5kSW5pdGlhbFNxbCIsIlNxbEJhdGNoUGF5bG9hZCIsImdldEluaXRpYWxTcWwiLCJjdXJyZW50VHJhbnNhY3Rpb25EZXNjcmlwdG9yIiwiTWVzc2FnZSIsIlNRTF9CQVRDSCIsIm91dGdvaW5nTWVzc2FnZVN0cmVhbSIsIlJlYWRhYmxlIiwicGlwZSIsInB1c2giLCJnZXRJc29sYXRpb25MZXZlbFRleHQiLCJqb2luIiwicHJvY2Vzc2VkSW5pdGlhbFNxbCIsImV4ZWNTcWxCYXRjaCIsIm1ha2VSZXF1ZXN0Iiwic3FsVGV4dE9yUHJvY2VkdXJlIiwiZXhlY1NxbCIsInZhbGlkYXRlUGFyYW1ldGVycyIsInBhcmFtZXRlcnMiLCJUWVBFUyIsIk5WYXJDaGFyIiwib3V0cHV0IiwibGVuZ3RoIiwicHJlY2lzaW9uIiwic2NhbGUiLCJtYWtlUGFyYW1zUGFyYW1ldGVyIiwiUlBDX1JFUVVFU1QiLCJScGNSZXF1ZXN0UGF5bG9hZCIsIm5ld0J1bGtMb2FkIiwidGFibGUiLCJjYWxsYmFja09yT3B0aW9ucyIsIkJ1bGtMb2FkIiwiZXhlY0J1bGtMb2FkIiwiYnVsa0xvYWQiLCJyb3dzIiwiZXhlY3V0aW9uU3RhcnRlZCIsInN0cmVhbWluZ01vZGUiLCJmaXJzdFJvd1dyaXR0ZW4iLCJyb3dTdHJlYW0iLCJyb3dUb1BhY2tldFRyYW5zZm9ybSIsImVuZCIsIm9uQ2FuY2VsIiwiQnVsa0xvYWRQYXlsb2FkIiwiUmVxdWVzdCIsImdldEJ1bGtJbnNlcnRTcWwiLCJCVUxLX0xPQUQiLCJwcmVwYXJlIiwiSW50IiwicHJlcGFyaW5nIiwiaGFuZGxlIiwidW5wcmVwYXJlIiwiZXhlY3V0ZSIsImV4ZWN1dGVQYXJhbWV0ZXJzIiwiaSIsImxlbiIsInBhcmFtZXRlciIsInZhbGlkYXRlIiwiY2FsbFByb2NlZHVyZSIsImJlZ2luVHJhbnNhY3Rpb24iLCJ0cmFuc2FjdGlvbiIsIlRyYW5zYWN0aW9uIiwiaXNvbGF0aW9uTGV2ZWxUb1RTUUwiLCJUUkFOU0FDVElPTl9NQU5BR0VSIiwiYmVnaW5QYXlsb2FkIiwiY29tbWl0VHJhbnNhY3Rpb24iLCJjb21taXRQYXlsb2FkIiwicm9sbGJhY2tUcmFuc2FjdGlvbiIsInJvbGxiYWNrUGF5bG9hZCIsInNhdmVUcmFuc2FjdGlvbiIsInNhdmVQYXlsb2FkIiwiY2IiLCJ1c2VTYXZlcG9pbnQiLCJjcnlwdG8iLCJyYW5kb21CeXRlcyIsInR4RG9uZSIsImRvbmUiLCJMT0dHRURfSU4iLCJ0eEVyciIsInBhY2tldFR5cGUiLCJjYW5jZWxlZCIsImNvbm5lY3Rpb24iLCJyb3dDb3VudCIsInJzdCIsInBheWxvYWRTdHJlYW0iLCJ1bnBpcGUiLCJpZ25vcmUiLCJwYXVzZWQiLCJyZXN1bWUiLCJyZXNldENvbm5lY3Rpb24iLCJTRU5UX0NMSUVOVF9SRVFVRVNUIiwicmVzZXQiLCJSRUFEX1VOQ09NTUlUVEVEIiwiUkVQRUFUQUJMRV9SRUFEIiwiU0VSSUFMSVpBQkxFIiwiU05BUFNIT1QiLCJpc1RyYW5zaWVudEVycm9yIiwiQWdncmVnYXRlRXJyb3IiLCJlcnJvcnMiLCJpc1RyYW5zaWVudCIsIm1vZHVsZSIsImV4cG9ydHMiLCJwcm90b3R5cGUiLCJyZWFkTWVzc2FnZSIsImNvbmNhdCIsInByZWxvZ2luUGF5bG9hZCIsImVuY3J5cHRpb25TdHJpbmciLCJzdGFydFRscyIsIlNFTlRfTE9HSU43X1dJVEhfRkVEQVVUSCIsIlNFTlRfTE9HSU43X1dJVEhfTlRMTSIsImNhdGNoIiwicmVjb25uZWN0IiwicmV0cnkiLCJMb2dpbjdUb2tlbkhhbmRsZXIiLCJ0b2tlblN0cmVhbVBhcnNlciIsImxvZ2luQWNrUmVjZWl2ZWQiLCJMT0dHRURfSU5fU0VORElOR19JTklUSUFMX1NRTCIsIk5UTE1SZXNwb25zZVBheWxvYWQiLCJOVExNQVVUSF9QS1QiLCJmZWRBdXRoSW5mb1Rva2VuIiwic3RzdXJsIiwic3BuIiwidG9rZW5TY29wZSIsIlVSTCIsImNyZWRlbnRpYWxzIiwiVXNlcm5hbWVQYXNzd29yZENyZWRlbnRpYWwiLCJtc2lBcmdzIiwiTWFuYWdlZElkZW50aXR5Q3JlZGVudGlhbCIsIm1hbmFnZWRJZGVudGl0eUNsaWVudElkIiwiRGVmYXVsdEF6dXJlQ3JlZGVudGlhbCIsIkNsaWVudFNlY3JldENyZWRlbnRpYWwiLCJ0b2tlblJlc3BvbnNlIiwiZ2V0VG9rZW4iLCJJbml0aWFsU3FsVG9rZW5IYW5kbGVyIiwiUmVxdWVzdFRva2VuSGFuZGxlciIsIlNFTlRfQVRURU5USU9OIiwib25SZXN1bWUiLCJvblBhdXNlIiwicGF1c2UiLCJvbkVuZE9mTWVzc2FnZSIsInNxbFJlcXVlc3QiLCJuZXh0U3RhdGUiLCJBdHRlbnRpb25Ub2tlbkhhbmRsZXIiLCJhdHRlbnRpb25SZWNlaXZlZCJdLCJzb3VyY2VzIjpbIi4uL3NyYy9jb25uZWN0aW9uLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjcnlwdG8gZnJvbSAnY3J5cHRvJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQgeyBTb2NrZXQgfSBmcm9tICduZXQnO1xuaW1wb3J0IGRucyBmcm9tICdkbnMnO1xuXG5pbXBvcnQgY29uc3RhbnRzIGZyb20gJ2NvbnN0YW50cyc7XG5pbXBvcnQgeyBTZWN1cmVDb250ZXh0T3B0aW9ucyB9IGZyb20gJ3Rscyc7XG5cbmltcG9ydCB7IFJlYWRhYmxlIH0gZnJvbSAnc3RyZWFtJztcblxuaW1wb3J0IHtcbiAgRGVmYXVsdEF6dXJlQ3JlZGVudGlhbCxcbiAgQ2xpZW50U2VjcmV0Q3JlZGVudGlhbCxcbiAgTWFuYWdlZElkZW50aXR5Q3JlZGVudGlhbCxcbiAgVXNlcm5hbWVQYXNzd29yZENyZWRlbnRpYWwsXG59IGZyb20gJ0BhenVyZS9pZGVudGl0eSc7XG5cbmltcG9ydCBCdWxrTG9hZCwgeyBPcHRpb25zIGFzIEJ1bGtMb2FkT3B0aW9ucywgQ2FsbGJhY2sgYXMgQnVsa0xvYWRDYWxsYmFjayB9IGZyb20gJy4vYnVsay1sb2FkJztcbmltcG9ydCBEZWJ1ZyBmcm9tICcuL2RlYnVnJztcbmltcG9ydCB7IEV2ZW50RW1pdHRlciwgb25jZSB9IGZyb20gJ2V2ZW50cyc7XG5pbXBvcnQgeyBpbnN0YW5jZUxvb2t1cCB9IGZyb20gJy4vaW5zdGFuY2UtbG9va3VwJztcbmltcG9ydCB7IFRyYW5zaWVudEVycm9yTG9va3VwIH0gZnJvbSAnLi90cmFuc2llbnQtZXJyb3ItbG9va3VwJztcbmltcG9ydCB7IFRZUEUgfSBmcm9tICcuL3BhY2tldCc7XG5pbXBvcnQgUHJlbG9naW5QYXlsb2FkIGZyb20gJy4vcHJlbG9naW4tcGF5bG9hZCc7XG5pbXBvcnQgTG9naW43UGF5bG9hZCBmcm9tICcuL2xvZ2luNy1wYXlsb2FkJztcbmltcG9ydCBOVExNUmVzcG9uc2VQYXlsb2FkIGZyb20gJy4vbnRsbS1wYXlsb2FkJztcbmltcG9ydCBSZXF1ZXN0IGZyb20gJy4vcmVxdWVzdCc7XG5pbXBvcnQgUnBjUmVxdWVzdFBheWxvYWQgZnJvbSAnLi9ycGNyZXF1ZXN0LXBheWxvYWQnO1xuaW1wb3J0IFNxbEJhdGNoUGF5bG9hZCBmcm9tICcuL3NxbGJhdGNoLXBheWxvYWQnO1xuaW1wb3J0IE1lc3NhZ2VJTyBmcm9tICcuL21lc3NhZ2UtaW8nO1xuaW1wb3J0IHsgUGFyc2VyIGFzIFRva2VuU3RyZWFtUGFyc2VyIH0gZnJvbSAnLi90b2tlbi90b2tlbi1zdHJlYW0tcGFyc2VyJztcbmltcG9ydCB7IFRyYW5zYWN0aW9uLCBJU09MQVRJT05fTEVWRUwsIGFzc2VydFZhbGlkSXNvbGF0aW9uTGV2ZWwgfSBmcm9tICcuL3RyYW5zYWN0aW9uJztcbmltcG9ydCB7IENvbm5lY3Rpb25FcnJvciwgUmVxdWVzdEVycm9yIH0gZnJvbSAnLi9lcnJvcnMnO1xuaW1wb3J0IHsgY29ubmVjdEluUGFyYWxsZWwsIGNvbm5lY3RJblNlcXVlbmNlIH0gZnJvbSAnLi9jb25uZWN0b3InO1xuaW1wb3J0IHsgbmFtZSBhcyBsaWJyYXJ5TmFtZSB9IGZyb20gJy4vbGlicmFyeSc7XG5pbXBvcnQgeyB2ZXJzaW9ucyB9IGZyb20gJy4vdGRzLXZlcnNpb25zJztcbmltcG9ydCBNZXNzYWdlIGZyb20gJy4vbWVzc2FnZSc7XG5pbXBvcnQgeyBNZXRhZGF0YSB9IGZyb20gJy4vbWV0YWRhdGEtcGFyc2VyJztcbmltcG9ydCB7IGNyZWF0ZU5UTE1SZXF1ZXN0IH0gZnJvbSAnLi9udGxtJztcbmltcG9ydCB7IENvbHVtbkVuY3J5cHRpb25BenVyZUtleVZhdWx0UHJvdmlkZXIgfSBmcm9tICcuL2Fsd2F5cy1lbmNyeXB0ZWQva2V5c3RvcmUtcHJvdmlkZXItYXp1cmUta2V5LXZhdWx0JztcblxuaW1wb3J0IHsgQWJvcnRDb250cm9sbGVyLCBBYm9ydFNpZ25hbCB9IGZyb20gJ25vZGUtYWJvcnQtY29udHJvbGxlcic7XG5pbXBvcnQgeyBQYXJhbWV0ZXIsIFRZUEVTIH0gZnJvbSAnLi9kYXRhLXR5cGUnO1xuaW1wb3J0IHsgQnVsa0xvYWRQYXlsb2FkIH0gZnJvbSAnLi9idWxrLWxvYWQtcGF5bG9hZCc7XG5pbXBvcnQgeyBDb2xsYXRpb24gfSBmcm9tICcuL2NvbGxhdGlvbic7XG5cbmltcG9ydCBBZ2dyZWdhdGVFcnJvciBmcm9tICdlcy1hZ2dyZWdhdGUtZXJyb3InO1xuaW1wb3J0IHsgdmVyc2lvbiB9IGZyb20gJy4uL3BhY2thZ2UuanNvbic7XG5pbXBvcnQgeyBVUkwgfSBmcm9tICd1cmwnO1xuaW1wb3J0IHsgQXR0ZW50aW9uVG9rZW5IYW5kbGVyLCBJbml0aWFsU3FsVG9rZW5IYW5kbGVyLCBMb2dpbjdUb2tlbkhhbmRsZXIsIFJlcXVlc3RUb2tlbkhhbmRsZXIsIFRva2VuSGFuZGxlciB9IGZyb20gJy4vdG9rZW4vaGFuZGxlcic7XG5cbnR5cGUgQmVnaW5UcmFuc2FjdGlvbkNhbGxiYWNrID1cbiAgLyoqXG4gICAqIFRoZSBjYWxsYmFjayBpcyBjYWxsZWQgd2hlbiB0aGUgcmVxdWVzdCB0byBzdGFydCB0aGUgdHJhbnNhY3Rpb24gaGFzIGNvbXBsZXRlZCxcbiAgICogZWl0aGVyIHN1Y2Nlc3NmdWxseSBvciB3aXRoIGFuIGVycm9yLlxuICAgKiBJZiBhbiBlcnJvciBvY2N1cnJlZCB0aGVuIGBlcnJgIHdpbGwgZGVzY3JpYmUgdGhlIGVycm9yLlxuICAgKlxuICAgKiBBcyBvbmx5IG9uZSByZXF1ZXN0IGF0IGEgdGltZSBtYXkgYmUgZXhlY3V0ZWQgb24gYSBjb25uZWN0aW9uLCBhbm90aGVyIHJlcXVlc3Qgc2hvdWxkIG5vdFxuICAgKiBiZSBpbml0aWF0ZWQgdW50aWwgdGhpcyBjYWxsYmFjayBpcyBjYWxsZWQuXG4gICAqXG4gICAqIEBwYXJhbSBlcnIgSWYgYW4gZXJyb3Igb2NjdXJyZWQsIGFuIFtbRXJyb3JdXSBvYmplY3Qgd2l0aCBkZXRhaWxzIG9mIHRoZSBlcnJvci5cbiAgICogQHBhcmFtIHRyYW5zYWN0aW9uRGVzY3JpcHRvciBBIEJ1ZmZlciB0aGF0IGRlc2NyaWJlIHRoZSB0cmFuc2FjdGlvblxuICAgKi9cbiAgKGVycjogRXJyb3IgfCBudWxsIHwgdW5kZWZpbmVkLCB0cmFuc2FjdGlvbkRlc2NyaXB0b3I/OiBCdWZmZXIpID0+IHZvaWRcblxudHlwZSBTYXZlVHJhbnNhY3Rpb25DYWxsYmFjayA9XG4gIC8qKlxuICAgKiBUaGUgY2FsbGJhY2sgaXMgY2FsbGVkIHdoZW4gdGhlIHJlcXVlc3QgdG8gc2V0IGEgc2F2ZXBvaW50IHdpdGhpbiB0aGVcbiAgICogdHJhbnNhY3Rpb24gaGFzIGNvbXBsZXRlZCwgZWl0aGVyIHN1Y2Nlc3NmdWxseSBvciB3aXRoIGFuIGVycm9yLlxuICAgKiBJZiBhbiBlcnJvciBvY2N1cnJlZCB0aGVuIGBlcnJgIHdpbGwgZGVzY3JpYmUgdGhlIGVycm9yLlxuICAgKlxuICAgKiBBcyBvbmx5IG9uZSByZXF1ZXN0IGF0IGEgdGltZSBtYXkgYmUgZXhlY3V0ZWQgb24gYSBjb25uZWN0aW9uLCBhbm90aGVyIHJlcXVlc3Qgc2hvdWxkIG5vdFxuICAgKiBiZSBpbml0aWF0ZWQgdW50aWwgdGhpcyBjYWxsYmFjayBpcyBjYWxsZWQuXG4gICAqXG4gICAqIEBwYXJhbSBlcnIgSWYgYW4gZXJyb3Igb2NjdXJyZWQsIGFuIFtbRXJyb3JdXSBvYmplY3Qgd2l0aCBkZXRhaWxzIG9mIHRoZSBlcnJvci5cbiAgICovXG4gIChlcnI6IEVycm9yIHwgbnVsbCB8IHVuZGVmaW5lZCkgPT4gdm9pZDtcblxudHlwZSBDb21taXRUcmFuc2FjdGlvbkNhbGxiYWNrID1cbiAgLyoqXG4gICAqIFRoZSBjYWxsYmFjayBpcyBjYWxsZWQgd2hlbiB0aGUgcmVxdWVzdCB0byBjb21taXQgdGhlIHRyYW5zYWN0aW9uIGhhcyBjb21wbGV0ZWQsXG4gICAqIGVpdGhlciBzdWNjZXNzZnVsbHkgb3Igd2l0aCBhbiBlcnJvci5cbiAgICogSWYgYW4gZXJyb3Igb2NjdXJyZWQgdGhlbiBgZXJyYCB3aWxsIGRlc2NyaWJlIHRoZSBlcnJvci5cbiAgICpcbiAgICogQXMgb25seSBvbmUgcmVxdWVzdCBhdCBhIHRpbWUgbWF5IGJlIGV4ZWN1dGVkIG9uIGEgY29ubmVjdGlvbiwgYW5vdGhlciByZXF1ZXN0IHNob3VsZCBub3RcbiAgICogYmUgaW5pdGlhdGVkIHVudGlsIHRoaXMgY2FsbGJhY2sgaXMgY2FsbGVkLlxuICAgKlxuICAgKiBAcGFyYW0gZXJyIElmIGFuIGVycm9yIG9jY3VycmVkLCBhbiBbW0Vycm9yXV0gb2JqZWN0IHdpdGggZGV0YWlscyBvZiB0aGUgZXJyb3IuXG4gICAqL1xuICAoZXJyOiBFcnJvciB8IG51bGwgfCB1bmRlZmluZWQpID0+IHZvaWQ7XG5cbnR5cGUgUm9sbGJhY2tUcmFuc2FjdGlvbkNhbGxiYWNrID1cbiAgLyoqXG4gICAqIFRoZSBjYWxsYmFjayBpcyBjYWxsZWQgd2hlbiB0aGUgcmVxdWVzdCB0byByb2xsYmFjayB0aGUgdHJhbnNhY3Rpb24gaGFzXG4gICAqIGNvbXBsZXRlZCwgZWl0aGVyIHN1Y2Nlc3NmdWxseSBvciB3aXRoIGFuIGVycm9yLlxuICAgKiBJZiBhbiBlcnJvciBvY2N1cnJlZCB0aGVuIGVyciB3aWxsIGRlc2NyaWJlIHRoZSBlcnJvci5cbiAgICpcbiAgICogQXMgb25seSBvbmUgcmVxdWVzdCBhdCBhIHRpbWUgbWF5IGJlIGV4ZWN1dGVkIG9uIGEgY29ubmVjdGlvbiwgYW5vdGhlciByZXF1ZXN0IHNob3VsZCBub3RcbiAgICogYmUgaW5pdGlhdGVkIHVudGlsIHRoaXMgY2FsbGJhY2sgaXMgY2FsbGVkLlxuICAgKlxuICAgKiBAcGFyYW0gZXJyIElmIGFuIGVycm9yIG9jY3VycmVkLCBhbiBbW0Vycm9yXV0gb2JqZWN0IHdpdGggZGV0YWlscyBvZiB0aGUgZXJyb3IuXG4gICAqL1xuICAoZXJyOiBFcnJvciB8IG51bGwgfCB1bmRlZmluZWQpID0+IHZvaWQ7XG5cbnR5cGUgUmVzZXRDYWxsYmFjayA9XG4gIC8qKlxuICAgKiBUaGUgY2FsbGJhY2sgaXMgY2FsbGVkIHdoZW4gdGhlIGNvbm5lY3Rpb24gcmVzZXQgaGFzIGNvbXBsZXRlZCxcbiAgICogZWl0aGVyIHN1Y2Nlc3NmdWxseSBvciB3aXRoIGFuIGVycm9yLlxuICAgKlxuICAgKiBJZiBhbiBlcnJvciBvY2N1cnJlZCB0aGVuIGBlcnJgIHdpbGwgZGVzY3JpYmUgdGhlIGVycm9yLlxuICAgKlxuICAgKiBBcyBvbmx5IG9uZSByZXF1ZXN0IGF0IGEgdGltZSBtYXkgYmUgZXhlY3V0ZWQgb24gYSBjb25uZWN0aW9uLCBhbm90aGVyXG4gICAqIHJlcXVlc3Qgc2hvdWxkIG5vdCBiZSBpbml0aWF0ZWQgdW50aWwgdGhpcyBjYWxsYmFjayBpcyBjYWxsZWRcbiAgICpcbiAgICogQHBhcmFtIGVyciBJZiBhbiBlcnJvciBvY2N1cnJlZCwgYW4gW1tFcnJvcl1dIG9iamVjdCB3aXRoIGRldGFpbHMgb2YgdGhlIGVycm9yLlxuICAgKi9cbiAgKGVycjogRXJyb3IgfCBudWxsIHwgdW5kZWZpbmVkKSA9PiB2b2lkO1xuXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG50eXBlIFRyYW5zYWN0aW9uQ2FsbGJhY2s8VCBleHRlbmRzIChlcnI6IEVycm9yIHwgbnVsbCB8IHVuZGVmaW5lZCwgLi4uYXJnczogYW55W10pID0+IHZvaWQ+ID1cbiAgLyoqXG4gICAqIFRoZSBjYWxsYmFjayBpcyBjYWxsZWQgd2hlbiB0aGUgcmVxdWVzdCB0byBzdGFydCBhIHRyYW5zYWN0aW9uIChvciBjcmVhdGUgYSBzYXZlcG9pbnQsIGluXG4gICAqIHRoZSBjYXNlIG9mIGEgbmVzdGVkIHRyYW5zYWN0aW9uKSBoYXMgY29tcGxldGVkLCBlaXRoZXIgc3VjY2Vzc2Z1bGx5IG9yIHdpdGggYW4gZXJyb3IuXG4gICAqIElmIGFuIGVycm9yIG9jY3VycmVkLCB0aGVuIGBlcnJgIHdpbGwgZGVzY3JpYmUgdGhlIGVycm9yLlxuICAgKiBJZiBubyBlcnJvciBvY2N1cnJlZCwgdGhlIGNhbGxiYWNrIHNob3VsZCBwZXJmb3JtIGl0cyB3b3JrIGFuZCBldmVudHVhbGx5IGNhbGxcbiAgICogYGRvbmVgIHdpdGggYW4gZXJyb3Igb3IgbnVsbCAodG8gdHJpZ2dlciBhIHRyYW5zYWN0aW9uIHJvbGxiYWNrIG9yIGFcbiAgICogdHJhbnNhY3Rpb24gY29tbWl0KSBhbmQgYW4gYWRkaXRpb25hbCBjb21wbGV0aW9uIGNhbGxiYWNrIHRoYXQgd2lsbCBiZSBjYWxsZWQgd2hlbiB0aGUgcmVxdWVzdFxuICAgKiB0byByb2xsYmFjayBvciBjb21taXQgdGhlIGN1cnJlbnQgdHJhbnNhY3Rpb24gaGFzIGNvbXBsZXRlZCwgZWl0aGVyIHN1Y2Nlc3NmdWxseSBvciB3aXRoIGFuIGVycm9yLlxuICAgKiBBZGRpdGlvbmFsIGFyZ3VtZW50cyBnaXZlbiB0byBgZG9uZWAgd2lsbCBiZSBwYXNzZWQgdGhyb3VnaCB0byB0aGlzIGNhbGxiYWNrLlxuICAgKlxuICAgKiBBcyBvbmx5IG9uZSByZXF1ZXN0IGF0IGEgdGltZSBtYXkgYmUgZXhlY3V0ZWQgb24gYSBjb25uZWN0aW9uLCBhbm90aGVyIHJlcXVlc3Qgc2hvdWxkIG5vdFxuICAgKiBiZSBpbml0aWF0ZWQgdW50aWwgdGhlIGNvbXBsZXRpb24gY2FsbGJhY2sgaXMgY2FsbGVkLlxuICAgKlxuICAgKiBAcGFyYW0gZXJyIElmIGFuIGVycm9yIG9jY3VycmVkLCBhbiBbW0Vycm9yXV0gb2JqZWN0IHdpdGggZGV0YWlscyBvZiB0aGUgZXJyb3IuXG4gICAqIEBwYXJhbSB0eERvbmUgSWYgbm8gZXJyb3Igb2NjdXJyZWQsIGEgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHRvIGNvbW1pdCBvciByb2xsYmFjayB0aGUgdHJhbnNhY3Rpb24uXG4gICAqL1xuICAoZXJyOiBFcnJvciB8IG51bGwgfCB1bmRlZmluZWQsIHR4RG9uZT86IFRyYW5zYWN0aW9uRG9uZTxUPikgPT4gdm9pZDtcblxudHlwZSBUcmFuc2FjdGlvbkRvbmVDYWxsYmFjayA9IChlcnI6IEVycm9yIHwgbnVsbCB8IHVuZGVmaW5lZCwgLi4uYXJnczogYW55W10pID0+IHZvaWQ7XG50eXBlIENhbGxiYWNrUGFyYW1ldGVyczxUIGV4dGVuZHMgKGVycjogRXJyb3IgfCBudWxsIHwgdW5kZWZpbmVkLCAuLi5hcmdzOiBhbnlbXSkgPT4gYW55PiA9IFQgZXh0ZW5kcyAoZXJyOiBFcnJvciB8IG51bGwgfCB1bmRlZmluZWQsIC4uLmFyZ3M6IGluZmVyIFApID0+IGFueSA/IFAgOiBuZXZlcjtcblxudHlwZSBUcmFuc2FjdGlvbkRvbmU8VCBleHRlbmRzIChlcnI6IEVycm9yIHwgbnVsbCB8IHVuZGVmaW5lZCwgLi4uYXJnczogYW55W10pID0+IHZvaWQ+ID1cbiAgLyoqXG4gICAqIElmIG5vIGVycm9yIG9jY3VycmVkLCBhIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB0byBjb21taXQgb3Igcm9sbGJhY2sgdGhlIHRyYW5zYWN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gZXJyIElmIGFuIGVyciBvY2N1cnJlZCwgYSBzdHJpbmcgd2l0aCBkZXRhaWxzIG9mIHRoZSBlcnJvci5cbiAgICovXG4gIChlcnI6IEVycm9yIHwgbnVsbCB8IHVuZGVmaW5lZCwgZG9uZTogVCwgLi4uYXJnczogQ2FsbGJhY2tQYXJhbWV0ZXJzPFQ+KSA9PiB2b2lkO1xuXG4vKipcbiAqIEBwcml2YXRlXG4gKi9cbmNvbnN0IEtFRVBfQUxJVkVfSU5JVElBTF9ERUxBWSA9IDMwICogMTAwMDtcbi8qKlxuICogQHByaXZhdGVcbiAqL1xuY29uc3QgREVGQVVMVF9DT05ORUNUX1RJTUVPVVQgPSAxNSAqIDEwMDA7XG4vKipcbiAqIEBwcml2YXRlXG4gKi9cbmNvbnN0IERFRkFVTFRfQ0xJRU5UX1JFUVVFU1RfVElNRU9VVCA9IDE1ICogMTAwMDtcbi8qKlxuICogQHByaXZhdGVcbiAqL1xuY29uc3QgREVGQVVMVF9DQU5DRUxfVElNRU9VVCA9IDUgKiAxMDAwO1xuLyoqXG4gKiBAcHJpdmF0ZVxuICovXG5jb25zdCBERUZBVUxUX0NPTk5FQ1RfUkVUUllfSU5URVJWQUwgPSA1MDA7XG4vKipcbiAqIEBwcml2YXRlXG4gKi9cbmNvbnN0IERFRkFVTFRfUEFDS0VUX1NJWkUgPSA0ICogMTAyNDtcbi8qKlxuICogQHByaXZhdGVcbiAqL1xuY29uc3QgREVGQVVMVF9URVhUU0laRSA9IDIxNDc0ODM2NDc7XG4vKipcbiAqIEBwcml2YXRlXG4gKi9cbmNvbnN0IERFRkFVTFRfREFURUZJUlNUID0gNztcbi8qKlxuICogQHByaXZhdGVcbiAqL1xuY29uc3QgREVGQVVMVF9QT1JUID0gMTQzMztcbi8qKlxuICogQHByaXZhdGVcbiAqL1xuY29uc3QgREVGQVVMVF9URFNfVkVSU0lPTiA9ICc3XzQnO1xuLyoqXG4gKiBAcHJpdmF0ZVxuICovXG5jb25zdCBERUZBVUxUX0xBTkdVQUdFID0gJ3VzX2VuZ2xpc2gnO1xuLyoqXG4gKiBAcHJpdmF0ZVxuICovXG5jb25zdCBERUZBVUxUX0RBVEVGT1JNQVQgPSAnbWR5JztcblxuaW50ZXJmYWNlIEF6dXJlQWN0aXZlRGlyZWN0b3J5TXNpQXBwU2VydmljZUF1dGhlbnRpY2F0aW9uIHtcbiAgdHlwZTogJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktbXNpLWFwcC1zZXJ2aWNlJztcbiAgb3B0aW9uczoge1xuICAgIC8qKlxuICAgICAqIElmIHlvdSB1c2VyIHdhbnQgdG8gY29ubmVjdCB0byBhbiBBenVyZSBhcHAgc2VydmljZSB1c2luZyBhIHNwZWNpZmljIGNsaWVudCBhY2NvdW50XG4gICAgICogdGhleSBuZWVkIHRvIHByb3ZpZGUgYGNsaWVudElkYCBhc3Njb2lhdGUgdG8gdGhlaXIgY3JlYXRlZCBpZG5ldGl0eS5cbiAgICAgKlxuICAgICAqIFRoaXMgaXMgb3B0aW9uYWwgZm9yIHJldHJpZXZlIHRva2VuIGZyb20gYXp1cmUgd2ViIGFwcCBzZXJ2aWNlXG4gICAgICovXG4gICAgY2xpZW50SWQ/OiBzdHJpbmc7XG4gIH07XG59XG5cbmludGVyZmFjZSBBenVyZUFjdGl2ZURpcmVjdG9yeU1zaVZtQXV0aGVudGljYXRpb24ge1xuICB0eXBlOiAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktdm0nO1xuICBvcHRpb25zOiB7XG4gICAgLyoqXG4gICAgICogSWYgeW91IHdhbnQgdG8gY29ubmVjdCB1c2luZyBhIHNwZWNpZmljIGNsaWVudCBhY2NvdW50XG4gICAgICogdGhleSBuZWVkIHRvIHByb3ZpZGUgYGNsaWVudElkYCBhc3NvY2lhdGVkIHRvIHRoZWlyIGNyZWF0ZWQgaWRlbnRpdHkuXG4gICAgICpcbiAgICAgKiBUaGlzIGlzIG9wdGlvbmFsIGZvciByZXRyaWV2ZSBhIHRva2VuXG4gICAgICovXG4gICAgY2xpZW50SWQ/OiBzdHJpbmc7XG4gIH07XG59XG5cbmludGVyZmFjZSBBenVyZUFjdGl2ZURpcmVjdG9yeURlZmF1bHRBdXRoZW50aWNhdGlvbiB7XG4gIHR5cGU6ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LWRlZmF1bHQnO1xuICBvcHRpb25zOiB7XG4gICAgLyoqXG4gICAgICogSWYgeW91IHdhbnQgdG8gY29ubmVjdCB1c2luZyBhIHNwZWNpZmljIGNsaWVudCBhY2NvdW50XG4gICAgICogdGhleSBuZWVkIHRvIHByb3ZpZGUgYGNsaWVudElkYCBhc3NvY2lhdGVkIHRvIHRoZWlyIGNyZWF0ZWQgaWRlbnRpdHkuXG4gICAgICpcbiAgICAgKiBUaGlzIGlzIG9wdGlvbmFsIGZvciByZXRyaWV2aW5nIGEgdG9rZW5cbiAgICAgKi9cbiAgICBjbGllbnRJZD86IHN0cmluZztcbiAgfTtcbn1cblxuXG5pbnRlcmZhY2UgQXp1cmVBY3RpdmVEaXJlY3RvcnlBY2Nlc3NUb2tlbkF1dGhlbnRpY2F0aW9uIHtcbiAgdHlwZTogJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktYWNjZXNzLXRva2VuJztcbiAgb3B0aW9uczoge1xuICAgIC8qKlxuICAgICAqIEEgdXNlciBuZWVkIHRvIHByb3ZpZGUgYHRva2VuYCB3aGljaCB0aGV5IHJldHJpdmVkIGVsc2Ugd2hlcmVcbiAgICAgKiB0byBmb3JtaW5nIHRoZSBjb25uZWN0aW9uLlxuICAgICAqL1xuICAgIHRva2VuOiBzdHJpbmc7XG4gIH07XG59XG5cbmludGVyZmFjZSBBenVyZUFjdGl2ZURpcmVjdG9yeVBhc3N3b3JkQXV0aGVudGljYXRpb24ge1xuICB0eXBlOiAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1wYXNzd29yZCc7XG4gIG9wdGlvbnM6IHtcbiAgICAvKipcbiAgICAgKiBBIHVzZXIgbmVlZCB0byBwcm92aWRlIGB1c2VyTmFtZWAgYXNzY29pYXRlIHRvIHRoZWlyIGFjY291bnQuXG4gICAgICovXG4gICAgdXNlck5hbWU6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEEgdXNlciBuZWVkIHRvIHByb3ZpZGUgYHBhc3N3b3JkYCBhc3Njb2lhdGUgdG8gdGhlaXIgYWNjb3VudC5cbiAgICAgKi9cbiAgICBwYXNzd29yZDogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQSBjbGllbnQgaWQgdG8gdXNlLlxuICAgICAqL1xuICAgIGNsaWVudElkOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBPcHRpb25hbCBwYXJhbWV0ZXIgZm9yIHNwZWNpZmljIEF6dXJlIHRlbmFudCBJRFxuICAgICAqL1xuICAgIHRlbmFudElkOiBzdHJpbmc7XG4gIH07XG59XG5cbmludGVyZmFjZSBBenVyZUFjdGl2ZURpcmVjdG9yeVNlcnZpY2VQcmluY2lwYWxTZWNyZXQge1xuICB0eXBlOiAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1zZXJ2aWNlLXByaW5jaXBhbC1zZWNyZXQnO1xuICBvcHRpb25zOiB7XG4gICAgLyoqXG4gICAgICogQXBwbGljYXRpb24gKGBjbGllbnRgKSBJRCBmcm9tIHlvdXIgcmVnaXN0ZXJlZCBBenVyZSBhcHBsaWNhdGlvblxuICAgICAqL1xuICAgIGNsaWVudElkOiBzdHJpbmc7XG4gICAgLyoqXG4gICAgICogVGhlIGNyZWF0ZWQgYGNsaWVudCBzZWNyZXRgIGZvciB0aGlzIHJlZ2lzdGVyZWQgQXp1cmUgYXBwbGljYXRpb25cbiAgICAgKi9cbiAgICBjbGllbnRTZWNyZXQ6IHN0cmluZztcbiAgICAvKipcbiAgICAgKiBEaXJlY3RvcnkgKGB0ZW5hbnRgKSBJRCBmcm9tIHlvdXIgcmVnaXN0ZXJlZCBBenVyZSBhcHBsaWNhdGlvblxuICAgICAqL1xuICAgIHRlbmFudElkOiBzdHJpbmc7XG4gIH07XG59XG5cbmludGVyZmFjZSBOdGxtQXV0aGVudGljYXRpb24ge1xuICB0eXBlOiAnbnRsbSc7XG4gIG9wdGlvbnM6IHtcbiAgICAvKipcbiAgICAgKiBVc2VyIG5hbWUgZnJvbSB5b3VyIHdpbmRvd3MgYWNjb3VudC5cbiAgICAgKi9cbiAgICB1c2VyTmFtZTogc3RyaW5nO1xuICAgIC8qKlxuICAgICAqIFBhc3N3b3JkIGZyb20geW91ciB3aW5kb3dzIGFjY291bnQuXG4gICAgICovXG4gICAgcGFzc3dvcmQ6IHN0cmluZztcbiAgICAvKipcbiAgICAgKiBPbmNlIHlvdSBzZXQgZG9tYWluIGZvciBudGxtIGF1dGhlbnRpY2F0aW9uIHR5cGUsIGRyaXZlciB3aWxsIGNvbm5lY3QgdG8gU1FMIFNlcnZlciB1c2luZyBkb21haW4gbG9naW4uXG4gICAgICpcbiAgICAgKiBUaGlzIGlzIG5lY2Vzc2FyeSBmb3IgZm9ybWluZyBhIGNvbm5lY3Rpb24gdXNpbmcgbnRsbSB0eXBlXG4gICAgICovXG4gICAgZG9tYWluOiBzdHJpbmc7XG4gIH07XG59XG5cbmludGVyZmFjZSBEZWZhdWx0QXV0aGVudGljYXRpb24ge1xuICB0eXBlOiAnZGVmYXVsdCc7XG4gIG9wdGlvbnM6IHtcbiAgICAvKipcbiAgICAgKiBVc2VyIG5hbWUgdG8gdXNlIGZvciBzcWwgc2VydmVyIGxvZ2luLlxuICAgICAqL1xuICAgIHVzZXJOYW1lPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIFBhc3N3b3JkIHRvIHVzZSBmb3Igc3FsIHNlcnZlciBsb2dpbi5cbiAgICAgKi9cbiAgICBwYXNzd29yZD86IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgfTtcbn1cblxuaW50ZXJmYWNlIEVycm9yV2l0aENvZGUgZXh0ZW5kcyBFcnJvciB7XG4gIGNvZGU/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBJbnRlcm5hbENvbm5lY3Rpb25Db25maWcge1xuICBzZXJ2ZXI6IHN0cmluZztcbiAgYXV0aGVudGljYXRpb246IERlZmF1bHRBdXRoZW50aWNhdGlvbiB8IE50bG1BdXRoZW50aWNhdGlvbiB8IEF6dXJlQWN0aXZlRGlyZWN0b3J5UGFzc3dvcmRBdXRoZW50aWNhdGlvbiB8IEF6dXJlQWN0aXZlRGlyZWN0b3J5TXNpQXBwU2VydmljZUF1dGhlbnRpY2F0aW9uIHwgQXp1cmVBY3RpdmVEaXJlY3RvcnlNc2lWbUF1dGhlbnRpY2F0aW9uIHwgQXp1cmVBY3RpdmVEaXJlY3RvcnlBY2Nlc3NUb2tlbkF1dGhlbnRpY2F0aW9uIHwgQXp1cmVBY3RpdmVEaXJlY3RvcnlTZXJ2aWNlUHJpbmNpcGFsU2VjcmV0IHwgQXp1cmVBY3RpdmVEaXJlY3RvcnlEZWZhdWx0QXV0aGVudGljYXRpb247XG4gIG9wdGlvbnM6IEludGVybmFsQ29ubmVjdGlvbk9wdGlvbnM7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW50ZXJuYWxDb25uZWN0aW9uT3B0aW9ucyB7XG4gIGFib3J0VHJhbnNhY3Rpb25PbkVycm9yOiBib29sZWFuO1xuICBhcHBOYW1lOiB1bmRlZmluZWQgfCBzdHJpbmc7XG4gIGNhbWVsQ2FzZUNvbHVtbnM6IGJvb2xlYW47XG4gIGNhbmNlbFRpbWVvdXQ6IG51bWJlcjtcbiAgY29sdW1uRW5jcnlwdGlvbktleUNhY2hlVFRMOiBudW1iZXI7XG4gIGNvbHVtbkVuY3J5cHRpb25TZXR0aW5nOiBib29sZWFuO1xuICBjb2x1bW5OYW1lUmVwbGFjZXI6IHVuZGVmaW5lZCB8ICgoY29sTmFtZTogc3RyaW5nLCBpbmRleDogbnVtYmVyLCBtZXRhZGF0YTogTWV0YWRhdGEpID0+IHN0cmluZyk7XG4gIGNvbm5lY3Rpb25SZXRyeUludGVydmFsOiBudW1iZXI7XG4gIGNvbm5lY3RvcjogdW5kZWZpbmVkIHwgKCgpID0+IFByb21pc2U8U29ja2V0Pik7XG4gIGNvbm5lY3RUaW1lb3V0OiBudW1iZXI7XG4gIGNvbm5lY3Rpb25Jc29sYXRpb25MZXZlbDogdHlwZW9mIElTT0xBVElPTl9MRVZFTFtrZXlvZiB0eXBlb2YgSVNPTEFUSU9OX0xFVkVMXTtcbiAgY3J5cHRvQ3JlZGVudGlhbHNEZXRhaWxzOiBTZWN1cmVDb250ZXh0T3B0aW9ucztcbiAgZGF0YWJhc2U6IHVuZGVmaW5lZCB8IHN0cmluZztcbiAgZGF0ZWZpcnN0OiBudW1iZXI7XG4gIGRhdGVGb3JtYXQ6IHN0cmluZztcbiAgZGVidWc6IHtcbiAgICBkYXRhOiBib29sZWFuO1xuICAgIHBhY2tldDogYm9vbGVhbjtcbiAgICBwYXlsb2FkOiBib29sZWFuO1xuICAgIHRva2VuOiBib29sZWFuO1xuICB9O1xuICBlbmFibGVBbnNpTnVsbDogbnVsbCB8IGJvb2xlYW47XG4gIGVuYWJsZUFuc2lOdWxsRGVmYXVsdDogbnVsbCB8IGJvb2xlYW47XG4gIGVuYWJsZUFuc2lQYWRkaW5nOiBudWxsIHwgYm9vbGVhbjtcbiAgZW5hYmxlQW5zaVdhcm5pbmdzOiBudWxsIHwgYm9vbGVhbjtcbiAgZW5hYmxlQXJpdGhBYm9ydDogbnVsbCB8IGJvb2xlYW47XG4gIGVuYWJsZUNvbmNhdE51bGxZaWVsZHNOdWxsOiBudWxsIHwgYm9vbGVhbjtcbiAgZW5hYmxlQ3Vyc29yQ2xvc2VPbkNvbW1pdDogbnVsbCB8IGJvb2xlYW47XG4gIGVuYWJsZUltcGxpY2l0VHJhbnNhY3Rpb25zOiBudWxsIHwgYm9vbGVhbjtcbiAgZW5hYmxlTnVtZXJpY1JvdW5kYWJvcnQ6IG51bGwgfCBib29sZWFuO1xuICBlbmFibGVRdW90ZWRJZGVudGlmaWVyOiBudWxsIHwgYm9vbGVhbjtcbiAgZW5jcnlwdDogYm9vbGVhbjtcbiAgZW5jcnlwdGlvbktleVN0b3JlUHJvdmlkZXJzOiBLZXlTdG9yZVByb3ZpZGVyTWFwIHwgdW5kZWZpbmVkO1xuICBmYWxsYmFja1RvRGVmYXVsdERiOiBib29sZWFuO1xuICBpbnN0YW5jZU5hbWU6IHVuZGVmaW5lZCB8IHN0cmluZztcbiAgaXNvbGF0aW9uTGV2ZWw6IHR5cGVvZiBJU09MQVRJT05fTEVWRUxba2V5b2YgdHlwZW9mIElTT0xBVElPTl9MRVZFTF07XG4gIGxhbmd1YWdlOiBzdHJpbmc7XG4gIGxvY2FsQWRkcmVzczogdW5kZWZpbmVkIHwgc3RyaW5nO1xuICBtYXhSZXRyaWVzT25UcmFuc2llbnRFcnJvcnM6IG51bWJlcjtcbiAgbXVsdGlTdWJuZXRGYWlsb3ZlcjogYm9vbGVhbjtcbiAgcGFja2V0U2l6ZTogbnVtYmVyO1xuICBwb3J0OiB1bmRlZmluZWQgfCBudW1iZXI7XG4gIHJlYWRPbmx5SW50ZW50OiBib29sZWFuO1xuICByZXF1ZXN0VGltZW91dDogbnVtYmVyO1xuICByb3dDb2xsZWN0aW9uT25Eb25lOiBib29sZWFuO1xuICByb3dDb2xsZWN0aW9uT25SZXF1ZXN0Q29tcGxldGlvbjogYm9vbGVhbjtcbiAgc2VydmVyTmFtZTogdW5kZWZpbmVkIHwgc3RyaW5nO1xuICBzZXJ2ZXJTdXBwb3J0c0NvbHVtbkVuY3J5cHRpb246IGJvb2xlYW47XG4gIHRkc1ZlcnNpb246IHN0cmluZztcbiAgdGV4dHNpemU6IG51bWJlcjtcbiAgdHJ1c3RlZFNlcnZlck5hbWVBRTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICB0cnVzdFNlcnZlckNlcnRpZmljYXRlOiBib29sZWFuO1xuICB1c2VDb2x1bW5OYW1lczogYm9vbGVhbjtcbiAgdXNlVVRDOiBib29sZWFuO1xuICB3b3Jrc3RhdGlvbklkOiB1bmRlZmluZWQgfCBzdHJpbmc7XG4gIGxvd2VyQ2FzZUd1aWRzOiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgS2V5U3RvcmVQcm92aWRlck1hcCB7XG4gIFtrZXk6IHN0cmluZ106IENvbHVtbkVuY3J5cHRpb25BenVyZUtleVZhdWx0UHJvdmlkZXI7XG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqL1xuaW50ZXJmYWNlIFN0YXRlIHtcbiAgbmFtZTogc3RyaW5nO1xuICBlbnRlcj8odGhpczogQ29ubmVjdGlvbik6IHZvaWQ7XG4gIGV4aXQ/KHRoaXM6IENvbm5lY3Rpb24sIG5ld1N0YXRlOiBTdGF0ZSk6IHZvaWQ7XG4gIGV2ZW50czoge1xuICAgIHNvY2tldEVycm9yPyh0aGlzOiBDb25uZWN0aW9uLCBlcnI6IEVycm9yKTogdm9pZDtcbiAgICBjb25uZWN0VGltZW91dD8odGhpczogQ29ubmVjdGlvbik6IHZvaWQ7XG4gICAgbWVzc2FnZT8odGhpczogQ29ubmVjdGlvbiwgbWVzc2FnZTogTWVzc2FnZSk6IHZvaWQ7XG4gICAgcmV0cnk/KHRoaXM6IENvbm5lY3Rpb24pOiB2b2lkO1xuICAgIHJlY29ubmVjdD8odGhpczogQ29ubmVjdGlvbik6IHZvaWQ7XG4gIH07XG59XG5cbnR5cGUgQXV0aGVudGljYXRpb24gPSBEZWZhdWx0QXV0aGVudGljYXRpb24gfFxuICBOdGxtQXV0aGVudGljYXRpb24gfFxuICBBenVyZUFjdGl2ZURpcmVjdG9yeVBhc3N3b3JkQXV0aGVudGljYXRpb24gfFxuICBBenVyZUFjdGl2ZURpcmVjdG9yeU1zaUFwcFNlcnZpY2VBdXRoZW50aWNhdGlvbiB8XG4gIEF6dXJlQWN0aXZlRGlyZWN0b3J5TXNpVm1BdXRoZW50aWNhdGlvbiB8XG4gIEF6dXJlQWN0aXZlRGlyZWN0b3J5QWNjZXNzVG9rZW5BdXRoZW50aWNhdGlvbiB8XG4gIEF6dXJlQWN0aXZlRGlyZWN0b3J5U2VydmljZVByaW5jaXBhbFNlY3JldCB8XG4gIEF6dXJlQWN0aXZlRGlyZWN0b3J5RGVmYXVsdEF1dGhlbnRpY2F0aW9uO1xuXG50eXBlIEF1dGhlbnRpY2F0aW9uVHlwZSA9IEF1dGhlbnRpY2F0aW9uWyd0eXBlJ107XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29ubmVjdGlvbkNvbmZpZ3VyYXRpb24ge1xuICAvKipcbiAgICogSG9zdG5hbWUgdG8gY29ubmVjdCB0by5cbiAgICovXG4gIHNlcnZlcjogc3RyaW5nO1xuICAvKipcbiAgICogQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciBmb3JtaW5nIHRoZSBjb25uZWN0aW9uLlxuICAgKi9cbiAgb3B0aW9ucz86IENvbm5lY3Rpb25PcHRpb25zO1xuICAvKipcbiAgICogQXV0aGVudGljYXRpb24gcmVhbHRlZCBvcHRpb25zIGZvciBjb25uZWN0aW9uLlxuICAgKi9cbiAgYXV0aGVudGljYXRpb24/OiBBdXRoZW50aWNhdGlvbk9wdGlvbnM7XG59XG5cbmludGVyZmFjZSBEZWJ1Z09wdGlvbnMge1xuICAvKipcbiAgICogQSBib29sZWFuLCBjb250cm9sbGluZyB3aGV0aGVyIFtbZGVidWddXSBldmVudHMgd2lsbCBiZSBlbWl0dGVkIHdpdGggdGV4dCBkZXNjcmliaW5nIHBhY2tldCBkYXRhIGRldGFpbHNcbiAgICpcbiAgICogKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBkYXRhOiBib29sZWFuO1xuICAvKipcbiAgICogQSBib29sZWFuLCBjb250cm9sbGluZyB3aGV0aGVyIFtbZGVidWddXSBldmVudHMgd2lsbCBiZSBlbWl0dGVkIHdpdGggdGV4dCBkZXNjcmliaW5nIHBhY2tldCBkZXRhaWxzXG4gICAqXG4gICAqIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAgcGFja2V0OiBib29sZWFuO1xuICAvKipcbiAgICogQSBib29sZWFuLCBjb250cm9sbGluZyB3aGV0aGVyIFtbZGVidWddXSBldmVudHMgd2lsbCBiZSBlbWl0dGVkIHdpdGggdGV4dCBkZXNjcmliaW5nIHBhY2tldCBwYXlsb2FkIGRldGFpbHNcbiAgICpcbiAgICogKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBwYXlsb2FkOiBib29sZWFuO1xuICAvKipcbiAgICogQSBib29sZWFuLCBjb250cm9sbGluZyB3aGV0aGVyIFtbZGVidWddXSBldmVudHMgd2lsbCBiZSBlbWl0dGVkIHdpdGggdGV4dCBkZXNjcmliaW5nIHRva2VuIHN0cmVhbSB0b2tlbnNcbiAgICpcbiAgICogKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICB0b2tlbjogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIEF1dGhlbnRpY2F0aW9uT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBUeXBlIG9mIHRoZSBhdXRoZW50aWNhdGlvbiBtZXRob2QsIHZhbGlkIHR5cGVzIGFyZSBgZGVmYXVsdGAsIGBudGxtYCxcbiAgICogYGF6dXJlLWFjdGl2ZS1kaXJlY3RvcnktcGFzc3dvcmRgLCBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1hY2Nlc3MtdG9rZW5gLFxuICAgKiBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktdm1gLCBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktYXBwLXNlcnZpY2VgLFxuICAgKiBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1kZWZhdWx0YFxuICAgKiBvciBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1zZXJ2aWNlLXByaW5jaXBhbC1zZWNyZXRgXG4gICAqL1xuICB0eXBlPzogQXV0aGVudGljYXRpb25UeXBlO1xuICAvKipcbiAgICogRGlmZmVyZW50IG9wdGlvbnMgZm9yIGF1dGhlbnRpY2F0aW9uIHR5cGVzOlxuICAgKlxuICAgKiAqIGBkZWZhdWx0YDogW1tEZWZhdWx0QXV0aGVudGljYXRpb24ub3B0aW9uc11dXG4gICAqICogYG50bG1gIDpbW050bG1BdXRoZW50aWNhdGlvbl1dXG4gICAqICogYGF6dXJlLWFjdGl2ZS1kaXJlY3RvcnktcGFzc3dvcmRgIDogW1tBenVyZUFjdGl2ZURpcmVjdG9yeVBhc3N3b3JkQXV0aGVudGljYXRpb24ub3B0aW9uc11dXG4gICAqICogYGF6dXJlLWFjdGl2ZS1kaXJlY3RvcnktYWNjZXNzLXRva2VuYCA6IFtbQXp1cmVBY3RpdmVEaXJlY3RvcnlBY2Nlc3NUb2tlbkF1dGhlbnRpY2F0aW9uLm9wdGlvbnNdXVxuICAgKiAqIGBhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS12bWAgOiBbW0F6dXJlQWN0aXZlRGlyZWN0b3J5TXNpVm1BdXRoZW50aWNhdGlvbi5vcHRpb25zXV1cbiAgICogKiBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktYXBwLXNlcnZpY2VgIDogW1tBenVyZUFjdGl2ZURpcmVjdG9yeU1zaUFwcFNlcnZpY2VBdXRoZW50aWNhdGlvbi5vcHRpb25zXV1cbiAgICogKiBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1zZXJ2aWNlLXByaW5jaXBhbC1zZWNyZXRgIDogW1tBenVyZUFjdGl2ZURpcmVjdG9yeVNlcnZpY2VQcmluY2lwYWxTZWNyZXQub3B0aW9uc11dXG4gICAqICogYGF6dXJlLWFjdGl2ZS1kaXJlY3RvcnktZGVmYXVsdGAgOiBbW0F6dXJlQWN0aXZlRGlyZWN0b3J5RGVmYXVsdEF1dGhlbnRpY2F0aW9uLm9wdGlvbnNdXVxuICAgKi9cbiAgb3B0aW9ucz86IGFueTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb25uZWN0aW9uT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBBIGJvb2xlYW4gZGV0ZXJtaW5pbmcgd2hldGhlciB0byByb2xsYmFjayBhIHRyYW5zYWN0aW9uIGF1dG9tYXRpY2FsbHkgaWYgYW55IGVycm9yIGlzIGVuY291bnRlcmVkXG4gICAqIGR1cmluZyB0aGUgZ2l2ZW4gdHJhbnNhY3Rpb24ncyBleGVjdXRpb24uIFRoaXMgc2V0cyB0aGUgdmFsdWUgZm9yIGBTRVQgWEFDVF9BQk9SVGAgZHVyaW5nIHRoZVxuICAgKiBpbml0aWFsIFNRTCBwaGFzZSBvZiBhIGNvbm5lY3Rpb24gW2RvY3VtZW50YXRpb25dKGh0dHBzOi8vZG9jcy5taWNyb3NvZnQuY29tL2VuLXVzL3NxbC90LXNxbC9zdGF0ZW1lbnRzL3NldC14YWN0LWFib3J0LXRyYW5zYWN0LXNxbCkuXG4gICAqL1xuICBhYm9ydFRyYW5zYWN0aW9uT25FcnJvcj86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEFwcGxpY2F0aW9uIG5hbWUgdXNlZCBmb3IgaWRlbnRpZnlpbmcgYSBzcGVjaWZpYyBhcHBsaWNhdGlvbiBpbiBwcm9maWxpbmcsIGxvZ2dpbmcgb3IgdHJhY2luZyB0b29scyBvZiBTUUxTZXJ2ZXIuXG4gICAqXG4gICAqIChkZWZhdWx0OiBgVGVkaW91c2ApXG4gICAqL1xuICBhcHBOYW1lPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBBIGJvb2xlYW4sIGNvbnRyb2xsaW5nIHdoZXRoZXIgdGhlIGNvbHVtbiBuYW1lcyByZXR1cm5lZCB3aWxsIGhhdmUgdGhlIGZpcnN0IGxldHRlciBjb252ZXJ0ZWQgdG8gbG93ZXIgY2FzZVxuICAgKiAoYHRydWVgKSBvciBub3QuIFRoaXMgdmFsdWUgaXMgaWdub3JlZCBpZiB5b3UgcHJvdmlkZSBhIFtbY29sdW1uTmFtZVJlcGxhY2VyXV0uXG4gICAqXG4gICAqIChkZWZhdWx0OiBgZmFsc2VgKS5cbiAgICovXG4gIGNhbWVsQ2FzZUNvbHVtbnM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBiZWZvcmUgdGhlIFtbUmVxdWVzdC5jYW5jZWxdXSAoYWJvcnQpIG9mIGEgcmVxdWVzdCBpcyBjb25zaWRlcmVkIGZhaWxlZFxuICAgKlxuICAgKiAoZGVmYXVsdDogYDUwMDBgKS5cbiAgICovXG4gIGNhbmNlbFRpbWVvdXQ/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIEEgZnVuY3Rpb24gd2l0aCBwYXJhbWV0ZXJzIGAoY29sdW1uTmFtZSwgaW5kZXgsIGNvbHVtbk1ldGFEYXRhKWAgYW5kIHJldHVybmluZyBhIHN0cmluZy4gSWYgcHJvdmlkZWQsXG4gICAqIHRoaXMgd2lsbCBiZSBjYWxsZWQgb25jZSBwZXIgY29sdW1uIHBlciByZXN1bHQtc2V0LiBUaGUgcmV0dXJuZWQgdmFsdWUgd2lsbCBiZSB1c2VkIGluc3RlYWQgb2YgdGhlIFNRTC1wcm92aWRlZFxuICAgKiBjb2x1bW4gbmFtZSBvbiByb3cgYW5kIG1ldGEgZGF0YSBvYmplY3RzLiBUaGlzIGFsbG93cyB5b3UgdG8gZHluYW1pY2FsbHkgY29udmVydCBiZXR3ZWVuIG5hbWluZyBjb252ZW50aW9ucy5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGBudWxsYClcbiAgICovXG4gIGNvbHVtbk5hbWVSZXBsYWNlcj86IChjb2xOYW1lOiBzdHJpbmcsIGluZGV4OiBudW1iZXIsIG1ldGFkYXRhOiBNZXRhZGF0YSkgPT4gc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBOdW1iZXIgb2YgbWlsbGlzZWNvbmRzIGJlZm9yZSByZXRyeWluZyB0byBlc3RhYmxpc2ggY29ubmVjdGlvbiwgaW4gY2FzZSBvZiB0cmFuc2llbnQgZmFpbHVyZS5cbiAgICpcbiAgICogKGRlZmF1bHQ6YDUwMGApXG4gICAqL1xuICBjb25uZWN0aW9uUmV0cnlJbnRlcnZhbD86IG51bWJlcjtcblxuICAvKipcbiAgICogQ3VzdG9tIGNvbm5lY3RvciBmYWN0b3J5IG1ldGhvZC5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGB1bmRlZmluZWRgKVxuICAgKi9cbiAgY29ubmVjdG9yPzogKCkgPT4gUHJvbWlzZTxTb2NrZXQ+O1xuXG4gIC8qKlxuICAgKiBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBiZWZvcmUgdGhlIGF0dGVtcHQgdG8gY29ubmVjdCBpcyBjb25zaWRlcmVkIGZhaWxlZFxuICAgKlxuICAgKiAoZGVmYXVsdDogYDE1MDAwYCkuXG4gICAqL1xuICBjb25uZWN0VGltZW91dD86IG51bWJlcjtcblxuICAvKipcbiAgICogVGhlIGRlZmF1bHQgaXNvbGF0aW9uIGxldmVsIGZvciBuZXcgY29ubmVjdGlvbnMuIEFsbCBvdXQtb2YtdHJhbnNhY3Rpb24gcXVlcmllcyBhcmUgZXhlY3V0ZWQgd2l0aCB0aGlzIHNldHRpbmcuXG4gICAqXG4gICAqIFRoZSBpc29sYXRpb24gbGV2ZWxzIGFyZSBhdmFpbGFibGUgZnJvbSBgcmVxdWlyZSgndGVkaW91cycpLklTT0xBVElPTl9MRVZFTGAuXG4gICAqICogYFJFQURfVU5DT01NSVRURURgXG4gICAqICogYFJFQURfQ09NTUlUVEVEYFxuICAgKiAqIGBSRVBFQVRBQkxFX1JFQURgXG4gICAqICogYFNFUklBTElaQUJMRWBcbiAgICogKiBgU05BUFNIT1RgXG4gICAqXG4gICAqIChkZWZhdWx0OiBgUkVBRF9DT01NSVRFRGApLlxuICAgKi9cbiAgY29ubmVjdGlvbklzb2xhdGlvbkxldmVsPzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBXaGVuIGVuY3J5cHRpb24gaXMgdXNlZCwgYW4gb2JqZWN0IG1heSBiZSBzdXBwbGllZCB0aGF0IHdpbGwgYmUgdXNlZFxuICAgKiBmb3IgdGhlIGZpcnN0IGFyZ3VtZW50IHdoZW4gY2FsbGluZyBbYHRscy5jcmVhdGVTZWN1cmVQYWlyYF0oaHR0cDovL25vZGVqcy5vcmcvZG9jcy9sYXRlc3QvYXBpL3Rscy5odG1sI3Rsc190bHNfY3JlYXRlc2VjdXJlcGFpcl9jcmVkZW50aWFsc19pc3NlcnZlcl9yZXF1ZXN0Y2VydF9yZWplY3R1bmF1dGhvcml6ZWQpXG4gICAqXG4gICAqIChkZWZhdWx0OiBge31gKVxuICAgKi9cbiAgY3J5cHRvQ3JlZGVudGlhbHNEZXRhaWxzPzogU2VjdXJlQ29udGV4dE9wdGlvbnM7XG5cbiAgLyoqXG4gICAqIERhdGFiYXNlIHRvIGNvbm5lY3QgdG8gKGRlZmF1bHQ6IGRlcGVuZGVudCBvbiBzZXJ2ZXIgY29uZmlndXJhdGlvbikuXG4gICAqL1xuICBkYXRhYmFzZT86IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogU2V0cyB0aGUgZmlyc3QgZGF5IG9mIHRoZSB3ZWVrIHRvIGEgbnVtYmVyIGZyb20gMSB0aHJvdWdoIDcuXG4gICAqL1xuICBkYXRlZmlyc3Q/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIEEgc3RyaW5nIHJlcHJlc2VudGluZyBwb3NpdGlvbiBvZiBtb250aCwgZGF5IGFuZCB5ZWFyIGluIHRlbXBvcmFsIGRhdGF0eXBlcy5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGBtZHlgKVxuICAgKi9cbiAgZGF0ZUZvcm1hdD86IHN0cmluZztcblxuICBkZWJ1Zz86IERlYnVnT3B0aW9ucztcblxuICAvKipcbiAgICogQSBib29sZWFuLCBjb250cm9scyB0aGUgd2F5IG51bGwgdmFsdWVzIHNob3VsZCBiZSB1c2VkIGR1cmluZyBjb21wYXJpc29uIG9wZXJhdGlvbi5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIGVuYWJsZUFuc2lOdWxsPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogSWYgdHJ1ZSwgYFNFVCBBTlNJX05VTExfREZMVF9PTiBPTmAgd2lsbCBiZSBzZXQgaW4gdGhlIGluaXRpYWwgc3FsLiBUaGlzIG1lYW5zIG5ldyBjb2x1bW5zIHdpbGwgYmVcbiAgICogbnVsbGFibGUgYnkgZGVmYXVsdC4gU2VlIHRoZSBbVC1TUUwgZG9jdW1lbnRhdGlvbl0oaHR0cHM6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9tczE4NzM3NS5hc3B4KVxuICAgKlxuICAgKiAoZGVmYXVsdDogYHRydWVgKS5cbiAgICovXG4gIGVuYWJsZUFuc2lOdWxsRGVmYXVsdD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEEgYm9vbGVhbiwgY29udHJvbHMgaWYgcGFkZGluZyBzaG91bGQgYmUgYXBwbGllZCBmb3IgdmFsdWVzIHNob3J0ZXIgdGhhbiB0aGUgc2l6ZSBvZiBkZWZpbmVkIGNvbHVtbi5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIGVuYWJsZUFuc2lQYWRkaW5nPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogSWYgdHJ1ZSwgU1FMIFNlcnZlciB3aWxsIGZvbGxvdyBJU08gc3RhbmRhcmQgYmVoYXZpb3IgZHVyaW5nIHZhcmlvdXMgZXJyb3IgY29uZGl0aW9ucy4gRm9yIGRldGFpbHMsXG4gICAqIHNlZSBbZG9jdW1lbnRhdGlvbl0oaHR0cHM6Ly9kb2NzLm1pY3Jvc29mdC5jb20vZW4tdXMvc3FsL3Qtc3FsL3N0YXRlbWVudHMvc2V0LWFuc2ktd2FybmluZ3MtdHJhbnNhY3Qtc3FsKVxuICAgKlxuICAgKiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgZW5hYmxlQW5zaVdhcm5pbmdzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogRW5kcyBhIHF1ZXJ5IHdoZW4gYW4gb3ZlcmZsb3cgb3IgZGl2aWRlLWJ5LXplcm8gZXJyb3Igb2NjdXJzIGR1cmluZyBxdWVyeSBleGVjdXRpb24uXG4gICAqIFNlZSBbZG9jdW1lbnRhdGlvbl0oaHR0cHM6Ly9kb2NzLm1pY3Jvc29mdC5jb20vZW4tdXMvc3FsL3Qtc3FsL3N0YXRlbWVudHMvc2V0LWFyaXRoYWJvcnQtdHJhbnNhY3Qtc3FsP3ZpZXc9c3FsLXNlcnZlci0yMDE3KVxuICAgKiBmb3IgbW9yZSBkZXRhaWxzLlxuICAgKlxuICAgKiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgZW5hYmxlQXJpdGhBYm9ydD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEEgYm9vbGVhbiwgZGV0ZXJtaW5lcyBpZiBjb25jYXRlbmF0aW9uIHdpdGggTlVMTCBzaG91bGQgcmVzdWx0IGluIE5VTEwgb3IgZW1wdHkgc3RyaW5nIHZhbHVlLCBtb3JlIGRldGFpbHMgaW5cbiAgICogW2RvY3VtZW50YXRpb25dKGh0dHBzOi8vZG9jcy5taWNyb3NvZnQuY29tL2VuLXVzL3NxbC90LXNxbC9zdGF0ZW1lbnRzL3NldC1jb25jYXQtbnVsbC15aWVsZHMtbnVsbC10cmFuc2FjdC1zcWwpXG4gICAqXG4gICAqIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICBlbmFibGVDb25jYXROdWxsWWllbGRzTnVsbD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEEgYm9vbGVhbiwgY29udHJvbHMgd2hldGhlciBjdXJzb3Igc2hvdWxkIGJlIGNsb3NlZCwgaWYgdGhlIHRyYW5zYWN0aW9uIG9wZW5pbmcgaXQgZ2V0cyBjb21taXR0ZWQgb3Igcm9sbGVkXG4gICAqIGJhY2suXG4gICAqXG4gICAqIChkZWZhdWx0OiBgbnVsbGApXG4gICAqL1xuICBlbmFibGVDdXJzb3JDbG9zZU9uQ29tbWl0PzogYm9vbGVhbiB8IG51bGw7XG5cbiAgLyoqXG4gICAqIEEgYm9vbGVhbiwgc2V0cyB0aGUgY29ubmVjdGlvbiB0byBlaXRoZXIgaW1wbGljaXQgb3IgYXV0b2NvbW1pdCB0cmFuc2FjdGlvbiBtb2RlLlxuICAgKlxuICAgKiAoZGVmYXVsdDogYGZhbHNlYClcbiAgICovXG4gIGVuYWJsZUltcGxpY2l0VHJhbnNhY3Rpb25zPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogSWYgZmFsc2UsIGVycm9yIGlzIG5vdCBnZW5lcmF0ZWQgZHVyaW5nIGxvc3Mgb2YgcHJlY2Vzc2lvbi5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBlbmFibGVOdW1lcmljUm91bmRhYm9ydD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIElmIHRydWUsIGNoYXJhY3RlcnMgZW5jbG9zZWQgaW4gc2luZ2xlIHF1b3RlcyBhcmUgdHJlYXRlZCBhcyBsaXRlcmFscyBhbmQgdGhvc2UgZW5jbG9zZWQgZG91YmxlIHF1b3RlcyBhcmUgdHJlYXRlZCBhcyBpZGVudGlmaWVycy5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIGVuYWJsZVF1b3RlZElkZW50aWZpZXI/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBBIGJvb2xlYW4gZGV0ZXJtaW5pbmcgd2hldGhlciBvciBub3QgdGhlIGNvbm5lY3Rpb24gd2lsbCBiZSBlbmNyeXB0ZWQuIFNldCB0byBgdHJ1ZWAgaWYgeW91J3JlIG9uIFdpbmRvd3MgQXp1cmUuXG4gICAqXG4gICAqIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAgZW5jcnlwdD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEJ5IGRlZmF1bHQsIGlmIHRoZSBkYXRhYmFzZSByZXF1ZXN0ZWQgYnkgW1tkYXRhYmFzZV1dIGNhbm5vdCBiZSBhY2Nlc3NlZCxcbiAgICogdGhlIGNvbm5lY3Rpb24gd2lsbCBmYWlsIHdpdGggYW4gZXJyb3IuIEhvd2V2ZXIsIGlmIFtbZmFsbGJhY2tUb0RlZmF1bHREYl1dIGlzXG4gICAqIHNldCB0byBgdHJ1ZWAsIHRoZW4gdGhlIHVzZXIncyBkZWZhdWx0IGRhdGFiYXNlIHdpbGwgYmUgdXNlZCBpbnN0ZWFkXG4gICAqXG4gICAqIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAgZmFsbGJhY2tUb0RlZmF1bHREYj86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFRoZSBpbnN0YW5jZSBuYW1lIHRvIGNvbm5lY3QgdG8uXG4gICAqIFRoZSBTUUwgU2VydmVyIEJyb3dzZXIgc2VydmljZSBtdXN0IGJlIHJ1bm5pbmcgb24gdGhlIGRhdGFiYXNlIHNlcnZlcixcbiAgICogYW5kIFVEUCBwb3J0IDE0MzQgb24gdGhlIGRhdGFiYXNlIHNlcnZlciBtdXN0IGJlIHJlYWNoYWJsZS5cbiAgICpcbiAgICogKG5vIGRlZmF1bHQpXG4gICAqXG4gICAqIE11dHVhbGx5IGV4Y2x1c2l2ZSB3aXRoIFtbcG9ydF1dLlxuICAgKi9cbiAgaW5zdGFuY2VOYW1lPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBUaGUgZGVmYXVsdCBpc29sYXRpb24gbGV2ZWwgdGhhdCB0cmFuc2FjdGlvbnMgd2lsbCBiZSBydW4gd2l0aC5cbiAgICpcbiAgICogVGhlIGlzb2xhdGlvbiBsZXZlbHMgYXJlIGF2YWlsYWJsZSBmcm9tIGByZXF1aXJlKCd0ZWRpb3VzJykuSVNPTEFUSU9OX0xFVkVMYC5cbiAgICogKiBgUkVBRF9VTkNPTU1JVFRFRGBcbiAgICogKiBgUkVBRF9DT01NSVRURURgXG4gICAqICogYFJFUEVBVEFCTEVfUkVBRGBcbiAgICogKiBgU0VSSUFMSVpBQkxFYFxuICAgKiAqIGBTTkFQU0hPVGBcbiAgICpcbiAgICogKGRlZmF1bHQ6IGBSRUFEX0NPTU1JVEVEYCkuXG4gICAqL1xuICBpc29sYXRpb25MZXZlbD86IG51bWJlcjtcblxuICAvKipcbiAgICogU3BlY2lmaWVzIHRoZSBsYW5ndWFnZSBlbnZpcm9ubWVudCBmb3IgdGhlIHNlc3Npb24uIFRoZSBzZXNzaW9uIGxhbmd1YWdlIGRldGVybWluZXMgdGhlIGRhdGV0aW1lIGZvcm1hdHMgYW5kIHN5c3RlbSBtZXNzYWdlcy5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGB1c19lbmdsaXNoYCkuXG4gICAqL1xuICBsYW5ndWFnZT86IHN0cmluZztcblxuICAvKipcbiAgICogQSBzdHJpbmcgaW5kaWNhdGluZyB3aGljaCBuZXR3b3JrIGludGVyZmFjZSAoaXAgYWRkcmVzcykgdG8gdXNlIHdoZW4gY29ubmVjdGluZyB0byBTUUwgU2VydmVyLlxuICAgKi9cbiAgbG9jYWxBZGRyZXNzPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBBIGJvb2xlYW4gZGV0ZXJtaW5pbmcgd2hldGhlciB0byBwYXJzZSB1bmlxdWUgaWRlbnRpZmllciB0eXBlIHdpdGggbG93ZXJjYXNlIGNhc2UgY2hhcmFjdGVycy5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGBmYWxzZWApLlxuICAgKi9cbiAgbG93ZXJDYXNlR3VpZHM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBUaGUgbWF4aW11bSBudW1iZXIgb2YgY29ubmVjdGlvbiByZXRyaWVzIGZvciB0cmFuc2llbnQgZXJyb3JzLuOAgVxuICAgKlxuICAgKiAoZGVmYXVsdDogYDNgKS5cbiAgICovXG4gIG1heFJldHJpZXNPblRyYW5zaWVudEVycm9ycz86IG51bWJlcjtcblxuICAvKipcbiAgICogU2V0cyB0aGUgTXVsdGlTdWJuZXRGYWlsb3ZlciA9IFRydWUgcGFyYW1ldGVyLCB3aGljaCBjYW4gaGVscCBtaW5pbWl6ZSB0aGUgY2xpZW50IHJlY292ZXJ5IGxhdGVuY3kgd2hlbiBmYWlsb3ZlcnMgb2NjdXIuXG4gICAqXG4gICAqIChkZWZhdWx0OiBgZmFsc2VgKS5cbiAgICovXG4gIG11bHRpU3VibmV0RmFpbG92ZXI/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBUaGUgc2l6ZSBvZiBURFMgcGFja2V0cyAoc3ViamVjdCB0byBuZWdvdGlhdGlvbiB3aXRoIHRoZSBzZXJ2ZXIpLlxuICAgKiBTaG91bGQgYmUgYSBwb3dlciBvZiAyLlxuICAgKlxuICAgKiAoZGVmYXVsdDogYDQwOTZgKS5cbiAgICovXG4gIHBhY2tldFNpemU/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIFBvcnQgdG8gY29ubmVjdCB0byAoZGVmYXVsdDogYDE0MzNgKS5cbiAgICpcbiAgICogTXV0dWFsbHkgZXhjbHVzaXZlIHdpdGggW1tpbnN0YW5jZU5hbWVdXVxuICAgKi9cbiAgcG9ydD86IG51bWJlcjtcblxuICAvKipcbiAgICogQSBib29sZWFuLCBkZXRlcm1pbmluZyB3aGV0aGVyIHRoZSBjb25uZWN0aW9uIHdpbGwgcmVxdWVzdCByZWFkIG9ubHkgYWNjZXNzIGZyb20gYSBTUUwgU2VydmVyIEF2YWlsYWJpbGl0eVxuICAgKiBHcm91cC4gRm9yIG1vcmUgaW5mb3JtYXRpb24sIHNlZSBbaGVyZV0oaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L2hoNzEwMDU0LmFzcHggXCJNaWNyb3NvZnQ6IENvbmZpZ3VyZSBSZWFkLU9ubHkgUm91dGluZyBmb3IgYW4gQXZhaWxhYmlsaXR5IEdyb3VwIChTUUwgU2VydmVyKVwiKVxuICAgKlxuICAgKiAoZGVmYXVsdDogYGZhbHNlYCkuXG4gICAqL1xuICByZWFkT25seUludGVudD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGJlZm9yZSBhIHJlcXVlc3QgaXMgY29uc2lkZXJlZCBmYWlsZWQsIG9yIGAwYCBmb3Igbm8gdGltZW91dFxuICAgKlxuICAgKiAoZGVmYXVsdDogYDE1MDAwYCkuXG4gICAqL1xuICByZXF1ZXN0VGltZW91dD86IG51bWJlcjtcblxuICAvKipcbiAgICogQSBib29sZWFuLCB0aGF0IHdoZW4gdHJ1ZSB3aWxsIGV4cG9zZSByZWNlaXZlZCByb3dzIGluIFJlcXVlc3RzIGRvbmUgcmVsYXRlZCBldmVudHM6XG4gICAqICogW1tSZXF1ZXN0LkV2ZW50X2RvbmVJblByb2NdXVxuICAgKiAqIFtbUmVxdWVzdC5FdmVudF9kb25lUHJvY11dXG4gICAqICogW1tSZXF1ZXN0LkV2ZW50X2RvbmVdXVxuICAgKlxuICAgKiAoZGVmYXVsdDogYGZhbHNlYClcbiAgICpcbiAgICogQ2F1dGlvbjogSWYgbWFueSByb3cgYXJlIHJlY2VpdmVkLCBlbmFibGluZyB0aGlzIG9wdGlvbiBjb3VsZCByZXN1bHQgaW5cbiAgICogZXhjZXNzaXZlIG1lbW9yeSB1c2FnZS5cbiAgICovXG4gIHJvd0NvbGxlY3Rpb25PbkRvbmU/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBBIGJvb2xlYW4sIHRoYXQgd2hlbiB0cnVlIHdpbGwgZXhwb3NlIHJlY2VpdmVkIHJvd3MgaW4gUmVxdWVzdHMnIGNvbXBsZXRpb24gY2FsbGJhY2suU2VlIFtbUmVxdWVzdC5jb25zdHJ1Y3Rvcl1dLlxuICAgKlxuICAgKiAoZGVmYXVsdDogYGZhbHNlYClcbiAgICpcbiAgICogQ2F1dGlvbjogSWYgbWFueSByb3cgYXJlIHJlY2VpdmVkLCBlbmFibGluZyB0aGlzIG9wdGlvbiBjb3VsZCByZXN1bHQgaW5cbiAgICogZXhjZXNzaXZlIG1lbW9yeSB1c2FnZS5cbiAgICovXG4gIHJvd0NvbGxlY3Rpb25PblJlcXVlc3RDb21wbGV0aW9uPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogVGhlIHZlcnNpb24gb2YgVERTIHRvIHVzZS4gSWYgc2VydmVyIGRvZXNuJ3Qgc3VwcG9ydCBzcGVjaWZpZWQgdmVyc2lvbiwgbmVnb3RpYXRlZCB2ZXJzaW9uIGlzIHVzZWQgaW5zdGVhZC5cbiAgICpcbiAgICogVGhlIHZlcnNpb25zIGFyZSBhdmFpbGFibGUgZnJvbSBgcmVxdWlyZSgndGVkaW91cycpLlREU19WRVJTSU9OYC5cbiAgICogKiBgN18xYFxuICAgKiAqIGA3XzJgXG4gICAqICogYDdfM19BYFxuICAgKiAqIGA3XzNfQmBcbiAgICogKiBgN180YFxuICAgKlxuICAgKiAoZGVmYXVsdDogYDdfNGApXG4gICAqL1xuICB0ZHNWZXJzaW9uPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBTcGVjaWZpZXMgdGhlIHNpemUgb2YgdmFyY2hhcihtYXgpLCBudmFyY2hhcihtYXgpLCB2YXJiaW5hcnkobWF4KSwgdGV4dCwgbnRleHQsIGFuZCBpbWFnZSBkYXRhIHJldHVybmVkIGJ5IGEgU0VMRUNUIHN0YXRlbWVudC5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGAyMTQ3NDgzNjQ3YClcbiAgICovXG4gIHRleHRzaXplPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBJZiBcInRydWVcIiwgdGhlIFNRTCBTZXJ2ZXIgU1NMIGNlcnRpZmljYXRlIGlzIGF1dG9tYXRpY2FsbHkgdHJ1c3RlZCB3aGVuIHRoZSBjb21tdW5pY2F0aW9uIGxheWVyIGlzIGVuY3J5cHRlZCB1c2luZyBTU0wuXG4gICAqXG4gICAqIElmIFwiZmFsc2VcIiwgdGhlIFNRTCBTZXJ2ZXIgdmFsaWRhdGVzIHRoZSBzZXJ2ZXIgU1NMIGNlcnRpZmljYXRlLiBJZiB0aGUgc2VydmVyIGNlcnRpZmljYXRlIHZhbGlkYXRpb24gZmFpbHMsXG4gICAqIHRoZSBkcml2ZXIgcmFpc2VzIGFuIGVycm9yIGFuZCB0ZXJtaW5hdGVzIHRoZSBjb25uZWN0aW9uLiBNYWtlIHN1cmUgdGhlIHZhbHVlIHBhc3NlZCB0byBzZXJ2ZXJOYW1lIGV4YWN0bHlcbiAgICogbWF0Y2hlcyB0aGUgQ29tbW9uIE5hbWUgKENOKSBvciBETlMgbmFtZSBpbiB0aGUgU3ViamVjdCBBbHRlcm5hdGUgTmFtZSBpbiB0aGUgc2VydmVyIGNlcnRpZmljYXRlIGZvciBhbiBTU0wgY29ubmVjdGlvbiB0byBzdWNjZWVkLlxuICAgKlxuICAgKiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgdHJ1c3RTZXJ2ZXJDZXJ0aWZpY2F0ZT86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEEgYm9vbGVhbiBkZXRlcm1pbmluZyB3aGV0aGVyIHRvIHJldHVybiByb3dzIGFzIGFycmF5cyBvciBrZXktdmFsdWUgY29sbGVjdGlvbnMuXG4gICAqXG4gICAqIChkZWZhdWx0OiBgZmFsc2VgKS5cbiAgICovXG4gIHVzZUNvbHVtbk5hbWVzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogQSBib29sZWFuIGRldGVybWluaW5nIHdoZXRoZXIgdG8gcGFzcyB0aW1lIHZhbHVlcyBpbiBVVEMgb3IgbG9jYWwgdGltZS5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGB0cnVlYCkuXG4gICAqL1xuICB1c2VVVEM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBUaGUgd29ya3N0YXRpb24gSUQgKFdTSUQpIG9mIHRoZSBjbGllbnQsIGRlZmF1bHQgb3MuaG9zdG5hbWUoKS5cbiAgICogVXNlZCBmb3IgaWRlbnRpZnlpbmcgYSBzcGVjaWZpYyBjbGllbnQgaW4gcHJvZmlsaW5nLCBsb2dnaW5nIG9yXG4gICAqIHRyYWNpbmcgY2xpZW50IGFjdGl2aXR5IGluIFNRTFNlcnZlci5cbiAgICpcbiAgICogVGhlIHZhbHVlIGlzIHJlcG9ydGVkIGJ5IHRoZSBUU1FMIGZ1bmN0aW9uIEhPU1RfTkFNRSgpLlxuICAgKi9cbiAgd29ya3N0YXRpb25JZD86IHN0cmluZyB8IHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBAcHJpdmF0ZVxuICovXG5jb25zdCBDTEVBTlVQX1RZUEUgPSB7XG4gIE5PUk1BTDogMCxcbiAgUkVESVJFQ1Q6IDEsXG4gIFJFVFJZOiAyXG59O1xuXG5pbnRlcmZhY2UgUm91dGluZ0RhdGEge1xuICBzZXJ2ZXI6IHN0cmluZztcbiAgcG9ydDogbnVtYmVyO1xufVxuXG4vKipcbiAqIEEgW1tDb25uZWN0aW9uXV0gaW5zdGFuY2UgcmVwcmVzZW50cyBhIHNpbmdsZSBjb25uZWN0aW9uIHRvIGEgZGF0YWJhc2Ugc2VydmVyLlxuICpcbiAqIGBgYGpzXG4gKiB2YXIgQ29ubmVjdGlvbiA9IHJlcXVpcmUoJ3RlZGlvdXMnKS5Db25uZWN0aW9uO1xuICogdmFyIGNvbmZpZyA9IHtcbiAqICBcImF1dGhlbnRpY2F0aW9uXCI6IHtcbiAqICAgIC4uLixcbiAqICAgIFwib3B0aW9uc1wiOiB7Li4ufVxuICogIH0sXG4gKiAgXCJvcHRpb25zXCI6IHsuLi59XG4gKiB9O1xuICogdmFyIGNvbm5lY3Rpb24gPSBuZXcgQ29ubmVjdGlvbihjb25maWcpO1xuICogYGBgXG4gKlxuICogT25seSBvbmUgcmVxdWVzdCBhdCBhIHRpbWUgbWF5IGJlIGV4ZWN1dGVkIG9uIGEgY29ubmVjdGlvbi4gT25jZSBhIFtbUmVxdWVzdF1dXG4gKiBoYXMgYmVlbiBpbml0aWF0ZWQgKHdpdGggW1tDb25uZWN0aW9uLmNhbGxQcm9jZWR1cmVdXSwgW1tDb25uZWN0aW9uLmV4ZWNTcWxdXSxcbiAqIG9yIFtbQ29ubmVjdGlvbi5leGVjU3FsQmF0Y2hdXSksIGFub3RoZXIgc2hvdWxkIG5vdCBiZSBpbml0aWF0ZWQgdW50aWwgdGhlXG4gKiBbW1JlcXVlc3RdXSdzIGNvbXBsZXRpb24gY2FsbGJhY2sgaXMgY2FsbGVkLlxuICovXG5jbGFzcyBDb25uZWN0aW9uIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmZWRBdXRoUmVxdWlyZWQ6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY29uZmlnOiBJbnRlcm5hbENvbm5lY3Rpb25Db25maWc7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgc2VjdXJlQ29udGV4dE9wdGlvbnM6IFNlY3VyZUNvbnRleHRPcHRpb25zO1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGluVHJhbnNhY3Rpb246IGJvb2xlYW47XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgdHJhbnNhY3Rpb25EZXNjcmlwdG9yczogQnVmZmVyW107XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgdHJhbnNhY3Rpb25EZXB0aDogbnVtYmVyO1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGlzU3FsQmF0Y2g6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY3VyVHJhbnNpZW50UmV0cnlDb3VudDogbnVtYmVyO1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIHRyYW5zaWVudEVycm9yTG9va3VwOiBUcmFuc2llbnRFcnJvckxvb2t1cDtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBjbG9zZWQ6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgbG9naW5FcnJvcjogdW5kZWZpbmVkIHwgQWdncmVnYXRlRXJyb3IgfCBDb25uZWN0aW9uRXJyb3I7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVidWc6IERlYnVnO1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIG50bG1wYWNrZXQ6IHVuZGVmaW5lZCB8IGFueTtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBudGxtcGFja2V0QnVmZmVyOiB1bmRlZmluZWQgfCBCdWZmZXI7XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIFNUQVRFOiB7XG4gICAgSU5JVElBTElaRUQ6IFN0YXRlO1xuICAgIENPTk5FQ1RJTkc6IFN0YXRlO1xuICAgIFNFTlRfUFJFTE9HSU46IFN0YXRlO1xuICAgIFJFUk9VVElORzogU3RhdGU7XG4gICAgVFJBTlNJRU5UX0ZBSUxVUkVfUkVUUlk6IFN0YXRlO1xuICAgIFNFTlRfVExTU1NMTkVHT1RJQVRJT046IFN0YXRlO1xuICAgIFNFTlRfTE9HSU43X1dJVEhfU1RBTkRBUkRfTE9HSU46IFN0YXRlO1xuICAgIFNFTlRfTE9HSU43X1dJVEhfTlRMTTogU3RhdGU7XG4gICAgU0VOVF9MT0dJTjdfV0lUSF9GRURBVVRIOiBTdGF0ZTtcbiAgICBMT0dHRURfSU5fU0VORElOR19JTklUSUFMX1NRTDogU3RhdGU7XG4gICAgTE9HR0VEX0lOOiBTdGF0ZTtcbiAgICBTRU5UX0NMSUVOVF9SRVFVRVNUOiBTdGF0ZTtcbiAgICBTRU5UX0FUVEVOVElPTjogU3RhdGU7XG4gICAgRklOQUw6IFN0YXRlO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICByb3V0aW5nRGF0YTogdW5kZWZpbmVkIHwgUm91dGluZ0RhdGE7XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBtZXNzYWdlSW8hOiBNZXNzYWdlSU87XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgc3RhdGU6IFN0YXRlO1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIHJlc2V0Q29ubmVjdGlvbk9uTmV4dFJlcXVlc3Q6IHVuZGVmaW5lZCB8IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICByZXF1ZXN0OiB1bmRlZmluZWQgfCBSZXF1ZXN0IHwgQnVsa0xvYWQ7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgcHJvY1JldHVyblN0YXR1c1ZhbHVlOiB1bmRlZmluZWQgfCBhbnk7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgc29ja2V0OiB1bmRlZmluZWQgfCBTb2NrZXQ7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgbWVzc2FnZUJ1ZmZlcjogQnVmZmVyO1xuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY29ubmVjdFRpbWVyOiB1bmRlZmluZWQgfCBOb2RlSlMuVGltZW91dDtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBjYW5jZWxUaW1lcjogdW5kZWZpbmVkIHwgTm9kZUpTLlRpbWVvdXQ7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgcmVxdWVzdFRpbWVyOiB1bmRlZmluZWQgfCBOb2RlSlMuVGltZW91dDtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICByZXRyeVRpbWVyOiB1bmRlZmluZWQgfCBOb2RlSlMuVGltZW91dDtcblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9jYW5jZWxBZnRlclJlcXVlc3RTZW50OiAoKSA9PiB2b2lkO1xuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGF0YWJhc2VDb2xsYXRpb246IENvbGxhdGlvbiB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogTm90ZTogYmUgYXdhcmUgb2YgdGhlIGRpZmZlcmVudCBvcHRpb25zIGZpZWxkOlxuICAgKiAxLiBjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9uc1xuICAgKiAyLiBjb25maWcub3B0aW9uc1xuICAgKlxuICAgKiBgYGBqc1xuICAgKiBjb25zdCB7IENvbm5lY3Rpb24gfSA9IHJlcXVpcmUoJ3RlZGlvdXMnKTtcbiAgICpcbiAgICogY29uc3QgY29uZmlnID0ge1xuICAgKiAgXCJhdXRoZW50aWNhdGlvblwiOiB7XG4gICAqICAgIC4uLixcbiAgICogICAgXCJvcHRpb25zXCI6IHsuLi59XG4gICAqICB9LFxuICAgKiAgXCJvcHRpb25zXCI6IHsuLi59XG4gICAqIH07XG4gICAqXG4gICAqIGNvbnN0IGNvbm5lY3Rpb24gPSBuZXcgQ29ubmVjdGlvbihjb25maWcpO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIGNvbmZpZ1xuICAgKi9cbiAgY29uc3RydWN0b3IoY29uZmlnOiBDb25uZWN0aW9uQ29uZmlndXJhdGlvbikge1xuICAgIHN1cGVyKCk7XG5cbiAgICBpZiAodHlwZW9mIGNvbmZpZyAhPT0gJ29iamVjdCcgfHwgY29uZmlnID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWdcIiBhcmd1bWVudCBpcyByZXF1aXJlZCBhbmQgbXVzdCBiZSBvZiB0eXBlIE9iamVjdC4nKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGNvbmZpZy5zZXJ2ZXIgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcuc2VydmVyXCIgcHJvcGVydHkgaXMgcmVxdWlyZWQgYW5kIG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgfVxuXG4gICAgdGhpcy5mZWRBdXRoUmVxdWlyZWQgPSBmYWxzZTtcblxuICAgIGxldCBhdXRoZW50aWNhdGlvbjogSW50ZXJuYWxDb25uZWN0aW9uQ29uZmlnWydhdXRoZW50aWNhdGlvbiddO1xuICAgIGlmIChjb25maWcuYXV0aGVudGljYXRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKHR5cGVvZiBjb25maWcuYXV0aGVudGljYXRpb24gIT09ICdvYmplY3QnIHx8IGNvbmZpZy5hdXRoZW50aWNhdGlvbiA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcuYXV0aGVudGljYXRpb25cIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgT2JqZWN0LicpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB0eXBlID0gY29uZmlnLmF1dGhlbnRpY2F0aW9uLnR5cGU7XG4gICAgICBjb25zdCBvcHRpb25zID0gY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnMgPT09IHVuZGVmaW5lZCA/IHt9IDogY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnM7XG5cbiAgICAgIGlmICh0eXBlb2YgdHlwZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLmF1dGhlbnRpY2F0aW9uLnR5cGVcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZSAhPT0gJ2RlZmF1bHQnICYmIHR5cGUgIT09ICdudGxtJyAmJiB0eXBlICE9PSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1wYXNzd29yZCcgJiYgdHlwZSAhPT0gJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktYWNjZXNzLXRva2VuJyAmJiB0eXBlICE9PSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktdm0nICYmIHR5cGUgIT09ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS1hcHAtc2VydmljZScgJiYgdHlwZSAhPT0gJ2F6dXJlLWFjdGl2ZS1kaXJlY3Rvcnktc2VydmljZS1wcmluY2lwYWwtc2VjcmV0JyAmJiB0eXBlICE9PSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1kZWZhdWx0Jykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJ0eXBlXCIgcHJvcGVydHkgbXVzdCBvbmUgb2YgXCJkZWZhdWx0XCIsIFwibnRsbVwiLCBcImF6dXJlLWFjdGl2ZS1kaXJlY3RvcnktcGFzc3dvcmRcIiwgXCJhenVyZS1hY3RpdmUtZGlyZWN0b3J5LWFjY2Vzcy10b2tlblwiLCBcImF6dXJlLWFjdGl2ZS1kaXJlY3RvcnktZGVmYXVsdFwiLCBcImF6dXJlLWFjdGl2ZS1kaXJlY3RvcnktbXNpLXZtXCIgb3IgXCJhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS1hcHAtc2VydmljZVwiIG9yIFwiYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1zZXJ2aWNlLXByaW5jaXBhbC1zZWNyZXRcIi4nKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBvcHRpb25zICE9PSAnb2JqZWN0JyB8fCBvcHRpb25zID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIG9iamVjdC4nKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGUgPT09ICdudGxtJykge1xuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuZG9tYWluICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zLmRvbWFpblwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy51c2VyTmFtZSAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvcHRpb25zLnVzZXJOYW1lICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zLnVzZXJOYW1lXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLnBhc3N3b3JkICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9wdGlvbnMucGFzc3dvcmQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnMucGFzc3dvcmRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXV0aGVudGljYXRpb24gPSB7XG4gICAgICAgICAgdHlwZTogJ250bG0nLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIHVzZXJOYW1lOiBvcHRpb25zLnVzZXJOYW1lLFxuICAgICAgICAgICAgcGFzc3dvcmQ6IG9wdGlvbnMucGFzc3dvcmQsXG4gICAgICAgICAgICBkb21haW46IG9wdGlvbnMuZG9tYWluICYmIG9wdGlvbnMuZG9tYWluLnRvVXBwZXJDYXNlKClcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXBhc3N3b3JkJykge1xuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuY2xpZW50SWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnMuY2xpZW50SWRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wdGlvbnMudXNlck5hbWUgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb3B0aW9ucy51c2VyTmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9ucy51c2VyTmFtZVwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy5wYXNzd29yZCAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvcHRpb25zLnBhc3N3b3JkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zLnBhc3N3b3JkXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLnRlbmFudElkICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9wdGlvbnMudGVuYW50SWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnMudGVuYW50SWRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXV0aGVudGljYXRpb24gPSB7XG4gICAgICAgICAgdHlwZTogJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktcGFzc3dvcmQnLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIHVzZXJOYW1lOiBvcHRpb25zLnVzZXJOYW1lLFxuICAgICAgICAgICAgcGFzc3dvcmQ6IG9wdGlvbnMucGFzc3dvcmQsXG4gICAgICAgICAgICB0ZW5hbnRJZDogb3B0aW9ucy50ZW5hbnRJZCxcbiAgICAgICAgICAgIGNsaWVudElkOiBvcHRpb25zLmNsaWVudElkXG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1hY2Nlc3MtdG9rZW4nKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy50b2tlbiAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9ucy50b2tlblwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBhdXRoZW50aWNhdGlvbiA9IHtcbiAgICAgICAgICB0eXBlOiAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1hY2Nlc3MtdG9rZW4nLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIHRva2VuOiBvcHRpb25zLnRva2VuXG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktdm0nKSB7XG4gICAgICAgIGlmIChvcHRpb25zLmNsaWVudElkICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9wdGlvbnMuY2xpZW50SWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnMuY2xpZW50SWRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXV0aGVudGljYXRpb24gPSB7XG4gICAgICAgICAgdHlwZTogJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktbXNpLXZtJyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBjbGllbnRJZDogb3B0aW9ucy5jbGllbnRJZFxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktZGVmYXVsdCcpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMuY2xpZW50SWQgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb3B0aW9ucy5jbGllbnRJZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9ucy5jbGllbnRJZFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICAgIH1cbiAgICAgICAgYXV0aGVudGljYXRpb24gPSB7XG4gICAgICAgICAgdHlwZTogJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktZGVmYXVsdCcsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgY2xpZW50SWQ6IG9wdGlvbnMuY2xpZW50SWRcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS1hcHAtc2VydmljZScpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMuY2xpZW50SWQgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb3B0aW9ucy5jbGllbnRJZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9ucy5jbGllbnRJZFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBhdXRoZW50aWNhdGlvbiA9IHtcbiAgICAgICAgICB0eXBlOiAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktYXBwLXNlcnZpY2UnLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIGNsaWVudElkOiBvcHRpb25zLmNsaWVudElkXG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1zZXJ2aWNlLXByaW5jaXBhbC1zZWNyZXQnKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5jbGllbnRJZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9ucy5jbGllbnRJZFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuY2xpZW50U2VjcmV0ICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zLmNsaWVudFNlY3JldFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMudGVuYW50SWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnMudGVuYW50SWRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXV0aGVudGljYXRpb24gPSB7XG4gICAgICAgICAgdHlwZTogJ2F6dXJlLWFjdGl2ZS1kaXJlY3Rvcnktc2VydmljZS1wcmluY2lwYWwtc2VjcmV0JyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBjbGllbnRJZDogb3B0aW9ucy5jbGllbnRJZCxcbiAgICAgICAgICAgIGNsaWVudFNlY3JldDogb3B0aW9ucy5jbGllbnRTZWNyZXQsXG4gICAgICAgICAgICB0ZW5hbnRJZDogb3B0aW9ucy50ZW5hbnRJZFxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChvcHRpb25zLnVzZXJOYW1lICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9wdGlvbnMudXNlck5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnMudXNlck5hbWVcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wdGlvbnMucGFzc3dvcmQgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb3B0aW9ucy5wYXNzd29yZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9ucy5wYXNzd29yZFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBhdXRoZW50aWNhdGlvbiA9IHtcbiAgICAgICAgICB0eXBlOiAnZGVmYXVsdCcsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgdXNlck5hbWU6IG9wdGlvbnMudXNlck5hbWUsXG4gICAgICAgICAgICBwYXNzd29yZDogb3B0aW9ucy5wYXNzd29yZFxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgYXV0aGVudGljYXRpb24gPSB7XG4gICAgICAgIHR5cGU6ICdkZWZhdWx0JyxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIHVzZXJOYW1lOiB1bmRlZmluZWQsXG4gICAgICAgICAgcGFzc3dvcmQ6IHVuZGVmaW5lZFxuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cblxuICAgIHRoaXMuY29uZmlnID0ge1xuICAgICAgc2VydmVyOiBjb25maWcuc2VydmVyLFxuICAgICAgYXV0aGVudGljYXRpb246IGF1dGhlbnRpY2F0aW9uLFxuICAgICAgb3B0aW9uczoge1xuICAgICAgICBhYm9ydFRyYW5zYWN0aW9uT25FcnJvcjogZmFsc2UsXG4gICAgICAgIGFwcE5hbWU6IHVuZGVmaW5lZCxcbiAgICAgICAgY2FtZWxDYXNlQ29sdW1uczogZmFsc2UsXG4gICAgICAgIGNhbmNlbFRpbWVvdXQ6IERFRkFVTFRfQ0FOQ0VMX1RJTUVPVVQsXG4gICAgICAgIGNvbHVtbkVuY3J5cHRpb25LZXlDYWNoZVRUTDogMiAqIDYwICogNjAgKiAxMDAwLCAgLy8gVW5pdHM6IG1pbGlzZWNvbmRzXG4gICAgICAgIGNvbHVtbkVuY3J5cHRpb25TZXR0aW5nOiBmYWxzZSxcbiAgICAgICAgY29sdW1uTmFtZVJlcGxhY2VyOiB1bmRlZmluZWQsXG4gICAgICAgIGNvbm5lY3Rpb25SZXRyeUludGVydmFsOiBERUZBVUxUX0NPTk5FQ1RfUkVUUllfSU5URVJWQUwsXG4gICAgICAgIGNvbm5lY3RUaW1lb3V0OiBERUZBVUxUX0NPTk5FQ1RfVElNRU9VVCxcbiAgICAgICAgY29ubmVjdG9yOiB1bmRlZmluZWQsXG4gICAgICAgIGNvbm5lY3Rpb25Jc29sYXRpb25MZXZlbDogSVNPTEFUSU9OX0xFVkVMLlJFQURfQ09NTUlUVEVELFxuICAgICAgICBjcnlwdG9DcmVkZW50aWFsc0RldGFpbHM6IHt9LFxuICAgICAgICBkYXRhYmFzZTogdW5kZWZpbmVkLFxuICAgICAgICBkYXRlZmlyc3Q6IERFRkFVTFRfREFURUZJUlNULFxuICAgICAgICBkYXRlRm9ybWF0OiBERUZBVUxUX0RBVEVGT1JNQVQsXG4gICAgICAgIGRlYnVnOiB7XG4gICAgICAgICAgZGF0YTogZmFsc2UsXG4gICAgICAgICAgcGFja2V0OiBmYWxzZSxcbiAgICAgICAgICBwYXlsb2FkOiBmYWxzZSxcbiAgICAgICAgICB0b2tlbjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgZW5hYmxlQW5zaU51bGw6IHRydWUsXG4gICAgICAgIGVuYWJsZUFuc2lOdWxsRGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlQW5zaVBhZGRpbmc6IHRydWUsXG4gICAgICAgIGVuYWJsZUFuc2lXYXJuaW5nczogdHJ1ZSxcbiAgICAgICAgZW5hYmxlQXJpdGhBYm9ydDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlQ29uY2F0TnVsbFlpZWxkc051bGw6IHRydWUsXG4gICAgICAgIGVuYWJsZUN1cnNvckNsb3NlT25Db21taXQ6IG51bGwsXG4gICAgICAgIGVuYWJsZUltcGxpY2l0VHJhbnNhY3Rpb25zOiBmYWxzZSxcbiAgICAgICAgZW5hYmxlTnVtZXJpY1JvdW5kYWJvcnQ6IGZhbHNlLFxuICAgICAgICBlbmFibGVRdW90ZWRJZGVudGlmaWVyOiB0cnVlLFxuICAgICAgICBlbmNyeXB0OiB0cnVlLFxuICAgICAgICBmYWxsYmFja1RvRGVmYXVsdERiOiBmYWxzZSxcbiAgICAgICAgZW5jcnlwdGlvbktleVN0b3JlUHJvdmlkZXJzOiB1bmRlZmluZWQsXG4gICAgICAgIGluc3RhbmNlTmFtZTogdW5kZWZpbmVkLFxuICAgICAgICBpc29sYXRpb25MZXZlbDogSVNPTEFUSU9OX0xFVkVMLlJFQURfQ09NTUlUVEVELFxuICAgICAgICBsYW5ndWFnZTogREVGQVVMVF9MQU5HVUFHRSxcbiAgICAgICAgbG9jYWxBZGRyZXNzOiB1bmRlZmluZWQsXG4gICAgICAgIG1heFJldHJpZXNPblRyYW5zaWVudEVycm9yczogMyxcbiAgICAgICAgbXVsdGlTdWJuZXRGYWlsb3ZlcjogZmFsc2UsXG4gICAgICAgIHBhY2tldFNpemU6IERFRkFVTFRfUEFDS0VUX1NJWkUsXG4gICAgICAgIHBvcnQ6IERFRkFVTFRfUE9SVCxcbiAgICAgICAgcmVhZE9ubHlJbnRlbnQ6IGZhbHNlLFxuICAgICAgICByZXF1ZXN0VGltZW91dDogREVGQVVMVF9DTElFTlRfUkVRVUVTVF9USU1FT1VULFxuICAgICAgICByb3dDb2xsZWN0aW9uT25Eb25lOiBmYWxzZSxcbiAgICAgICAgcm93Q29sbGVjdGlvbk9uUmVxdWVzdENvbXBsZXRpb246IGZhbHNlLFxuICAgICAgICBzZXJ2ZXJOYW1lOiB1bmRlZmluZWQsXG4gICAgICAgIHNlcnZlclN1cHBvcnRzQ29sdW1uRW5jcnlwdGlvbjogZmFsc2UsXG4gICAgICAgIHRkc1ZlcnNpb246IERFRkFVTFRfVERTX1ZFUlNJT04sXG4gICAgICAgIHRleHRzaXplOiBERUZBVUxUX1RFWFRTSVpFLFxuICAgICAgICB0cnVzdGVkU2VydmVyTmFtZUFFOiB1bmRlZmluZWQsXG4gICAgICAgIHRydXN0U2VydmVyQ2VydGlmaWNhdGU6IGZhbHNlLFxuICAgICAgICB1c2VDb2x1bW5OYW1lczogZmFsc2UsXG4gICAgICAgIHVzZVVUQzogdHJ1ZSxcbiAgICAgICAgd29ya3N0YXRpb25JZDogdW5kZWZpbmVkLFxuICAgICAgICBsb3dlckNhc2VHdWlkczogZmFsc2VcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKGNvbmZpZy5vcHRpb25zKSB7XG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMucG9ydCAmJiBjb25maWcub3B0aW9ucy5pbnN0YW5jZU5hbWUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQb3J0IGFuZCBpbnN0YW5jZU5hbWUgYXJlIG11dHVhbGx5IGV4Y2x1c2l2ZSwgYnV0ICcgKyBjb25maWcub3B0aW9ucy5wb3J0ICsgJyBhbmQgJyArIGNvbmZpZy5vcHRpb25zLmluc3RhbmNlTmFtZSArICcgcHJvdmlkZWQnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmFib3J0VHJhbnNhY3Rpb25PbkVycm9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5hYm9ydFRyYW5zYWN0aW9uT25FcnJvciAhPT0gJ2Jvb2xlYW4nICYmIGNvbmZpZy5vcHRpb25zLmFib3J0VHJhbnNhY3Rpb25PbkVycm9yICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuYWJvcnRUcmFuc2FjdGlvbk9uRXJyb3JcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nIG9yIG51bGwuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmFib3J0VHJhbnNhY3Rpb25PbkVycm9yID0gY29uZmlnLm9wdGlvbnMuYWJvcnRUcmFuc2FjdGlvbk9uRXJyb3I7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5hcHBOYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5hcHBOYW1lICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmFwcE5hbWVcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5hcHBOYW1lID0gY29uZmlnLm9wdGlvbnMuYXBwTmFtZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmNhbWVsQ2FzZUNvbHVtbnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmNhbWVsQ2FzZUNvbHVtbnMgIT09ICdib29sZWFuJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmNhbWVsQ2FzZUNvbHVtbnNcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuY2FtZWxDYXNlQ29sdW1ucyA9IGNvbmZpZy5vcHRpb25zLmNhbWVsQ2FzZUNvbHVtbnM7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5jYW5jZWxUaW1lb3V0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5jYW5jZWxUaW1lb3V0ICE9PSAnbnVtYmVyJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmNhbmNlbFRpbWVvdXRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgbnVtYmVyLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5jYW5jZWxUaW1lb3V0ID0gY29uZmlnLm9wdGlvbnMuY2FuY2VsVGltZW91dDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmNvbHVtbk5hbWVSZXBsYWNlcikge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmNvbHVtbk5hbWVSZXBsYWNlciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmNhbmNlbFRpbWVvdXRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgZnVuY3Rpb24uJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmNvbHVtbk5hbWVSZXBsYWNlciA9IGNvbmZpZy5vcHRpb25zLmNvbHVtbk5hbWVSZXBsYWNlcjtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmNvbm5lY3Rpb25Jc29sYXRpb25MZXZlbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGFzc2VydFZhbGlkSXNvbGF0aW9uTGV2ZWwoY29uZmlnLm9wdGlvbnMuY29ubmVjdGlvbklzb2xhdGlvbkxldmVsLCAnY29uZmlnLm9wdGlvbnMuY29ubmVjdGlvbklzb2xhdGlvbkxldmVsJyk7XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5jb25uZWN0aW9uSXNvbGF0aW9uTGV2ZWwgPSBjb25maWcub3B0aW9ucy5jb25uZWN0aW9uSXNvbGF0aW9uTGV2ZWw7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5jb25uZWN0VGltZW91dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuY29ubmVjdFRpbWVvdXQgIT09ICdudW1iZXInKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuY29ubmVjdFRpbWVvdXRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgbnVtYmVyLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5jb25uZWN0VGltZW91dCA9IGNvbmZpZy5vcHRpb25zLmNvbm5lY3RUaW1lb3V0O1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuY29ubmVjdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5jb25uZWN0b3IgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5jb25uZWN0b3JcIiBwcm9wZXJ0eSBtdXN0IGJlIGEgZnVuY3Rpb24uJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmNvbm5lY3RvciA9IGNvbmZpZy5vcHRpb25zLmNvbm5lY3RvcjtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmNyeXB0b0NyZWRlbnRpYWxzRGV0YWlscyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuY3J5cHRvQ3JlZGVudGlhbHNEZXRhaWxzICE9PSAnb2JqZWN0JyB8fCBjb25maWcub3B0aW9ucy5jcnlwdG9DcmVkZW50aWFsc0RldGFpbHMgPT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5jcnlwdG9DcmVkZW50aWFsc0RldGFpbHNcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgT2JqZWN0LicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5jcnlwdG9DcmVkZW50aWFsc0RldGFpbHMgPSBjb25maWcub3B0aW9ucy5jcnlwdG9DcmVkZW50aWFsc0RldGFpbHM7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5kYXRhYmFzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuZGF0YWJhc2UgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZGF0YWJhc2VcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5kYXRhYmFzZSA9IGNvbmZpZy5vcHRpb25zLmRhdGFiYXNlO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZGF0ZWZpcnN0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5kYXRlZmlyc3QgIT09ICdudW1iZXInICYmIGNvbmZpZy5vcHRpb25zLmRhdGVmaXJzdCAhPT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmRhdGVmaXJzdFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBudW1iZXIuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZGF0ZWZpcnN0ICE9PSBudWxsICYmIChjb25maWcub3B0aW9ucy5kYXRlZmlyc3QgPCAxIHx8IGNvbmZpZy5vcHRpb25zLmRhdGVmaXJzdCA+IDcpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmRhdGVmaXJzdFwiIHByb3BlcnR5IG11c3QgYmUgPj0gMSBhbmQgPD0gNycpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5kYXRlZmlyc3QgPSBjb25maWcub3B0aW9ucy5kYXRlZmlyc3Q7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5kYXRlRm9ybWF0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5kYXRlRm9ybWF0ICE9PSAnc3RyaW5nJyAmJiBjb25maWcub3B0aW9ucy5kYXRlRm9ybWF0ICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZGF0ZUZvcm1hdFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcgb3IgbnVsbC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuZGF0ZUZvcm1hdCA9IGNvbmZpZy5vcHRpb25zLmRhdGVGb3JtYXQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5kZWJ1Zykge1xuICAgICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZGVidWcuZGF0YSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5kZWJ1Zy5kYXRhICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmRlYnVnLmRhdGFcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmRlYnVnLmRhdGEgPSBjb25maWcub3B0aW9ucy5kZWJ1Zy5kYXRhO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmRlYnVnLnBhY2tldCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5kZWJ1Zy5wYWNrZXQgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZGVidWcucGFja2V0XCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4uJyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5kZWJ1Zy5wYWNrZXQgPSBjb25maWcub3B0aW9ucy5kZWJ1Zy5wYWNrZXQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZGVidWcucGF5bG9hZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5kZWJ1Zy5wYXlsb2FkICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmRlYnVnLnBheWxvYWRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmRlYnVnLnBheWxvYWQgPSBjb25maWcub3B0aW9ucy5kZWJ1Zy5wYXlsb2FkO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmRlYnVnLnRva2VuICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmRlYnVnLnRva2VuICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmRlYnVnLnRva2VuXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4uJyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5kZWJ1Zy50b2tlbiA9IGNvbmZpZy5vcHRpb25zLmRlYnVnLnRva2VuO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaU51bGwgIT09ICdib29sZWFuJyAmJiBjb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbCAhPT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lOdWxsXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4gb3IgbnVsbC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaU51bGwgPSBjb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lOdWxsRGVmYXVsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaU51bGxEZWZhdWx0ICE9PSAnYm9vbGVhbicgJiYgY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaU51bGxEZWZhdWx0ICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaU51bGxEZWZhdWx0XCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4gb3IgbnVsbC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaU51bGxEZWZhdWx0ID0gY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaU51bGxEZWZhdWx0O1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaVBhZGRpbmcgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lQYWRkaW5nICE9PSAnYm9vbGVhbicgJiYgY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaVBhZGRpbmcgIT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5lbmFibGVBbnNpUGFkZGluZ1wiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuIG9yIG51bGwuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lQYWRkaW5nID0gY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaVBhZGRpbmc7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5lbmFibGVBbnNpV2FybmluZ3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lXYXJuaW5ncyAhPT0gJ2Jvb2xlYW4nICYmIGNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lXYXJuaW5ncyAhPT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lXYXJuaW5nc1wiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuIG9yIG51bGwuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lXYXJuaW5ncyA9IGNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lXYXJuaW5ncztcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmVuYWJsZUFyaXRoQWJvcnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmVuYWJsZUFyaXRoQWJvcnQgIT09ICdib29sZWFuJyAmJiBjb25maWcub3B0aW9ucy5lbmFibGVBcml0aEFib3J0ICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZW5hYmxlQXJpdGhBYm9ydFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuIG9yIG51bGwuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUFyaXRoQWJvcnQgPSBjb25maWcub3B0aW9ucy5lbmFibGVBcml0aEFib3J0O1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZW5hYmxlQ29uY2F0TnVsbFlpZWxkc051bGwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmVuYWJsZUNvbmNhdE51bGxZaWVsZHNOdWxsICE9PSAnYm9vbGVhbicgJiYgY29uZmlnLm9wdGlvbnMuZW5hYmxlQ29uY2F0TnVsbFlpZWxkc051bGwgIT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5lbmFibGVDb25jYXROdWxsWWllbGRzTnVsbFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuIG9yIG51bGwuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUNvbmNhdE51bGxZaWVsZHNOdWxsID0gY29uZmlnLm9wdGlvbnMuZW5hYmxlQ29uY2F0TnVsbFlpZWxkc051bGw7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5lbmFibGVDdXJzb3JDbG9zZU9uQ29tbWl0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5lbmFibGVDdXJzb3JDbG9zZU9uQ29tbWl0ICE9PSAnYm9vbGVhbicgJiYgY29uZmlnLm9wdGlvbnMuZW5hYmxlQ3Vyc29yQ2xvc2VPbkNvbW1pdCAhPT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmVuYWJsZUN1cnNvckNsb3NlT25Db21taXRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbiBvciBudWxsLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVDdXJzb3JDbG9zZU9uQ29tbWl0ID0gY29uZmlnLm9wdGlvbnMuZW5hYmxlQ3Vyc29yQ2xvc2VPbkNvbW1pdDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmVuYWJsZUltcGxpY2l0VHJhbnNhY3Rpb25zICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5lbmFibGVJbXBsaWNpdFRyYW5zYWN0aW9ucyAhPT0gJ2Jvb2xlYW4nICYmIGNvbmZpZy5vcHRpb25zLmVuYWJsZUltcGxpY2l0VHJhbnNhY3Rpb25zICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZW5hYmxlSW1wbGljaXRUcmFuc2FjdGlvbnNcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbiBvciBudWxsLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVJbXBsaWNpdFRyYW5zYWN0aW9ucyA9IGNvbmZpZy5vcHRpb25zLmVuYWJsZUltcGxpY2l0VHJhbnNhY3Rpb25zO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZW5hYmxlTnVtZXJpY1JvdW5kYWJvcnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmVuYWJsZU51bWVyaWNSb3VuZGFib3J0ICE9PSAnYm9vbGVhbicgJiYgY29uZmlnLm9wdGlvbnMuZW5hYmxlTnVtZXJpY1JvdW5kYWJvcnQgIT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5lbmFibGVOdW1lcmljUm91bmRhYm9ydFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuIG9yIG51bGwuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZU51bWVyaWNSb3VuZGFib3J0ID0gY29uZmlnLm9wdGlvbnMuZW5hYmxlTnVtZXJpY1JvdW5kYWJvcnQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5lbmFibGVRdW90ZWRJZGVudGlmaWVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5lbmFibGVRdW90ZWRJZGVudGlmaWVyICE9PSAnYm9vbGVhbicgJiYgY29uZmlnLm9wdGlvbnMuZW5hYmxlUXVvdGVkSWRlbnRpZmllciAhPT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmVuYWJsZVF1b3RlZElkZW50aWZpZXJcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbiBvciBudWxsLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVRdW90ZWRJZGVudGlmaWVyID0gY29uZmlnLm9wdGlvbnMuZW5hYmxlUXVvdGVkSWRlbnRpZmllcjtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmVuY3J5cHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmVuY3J5cHQgIT09ICdib29sZWFuJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmVuY3J5cHRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuZW5jcnlwdCA9IGNvbmZpZy5vcHRpb25zLmVuY3J5cHQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5mYWxsYmFja1RvRGVmYXVsdERiICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5mYWxsYmFja1RvRGVmYXVsdERiICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5mYWxsYmFja1RvRGVmYXVsdERiXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4uJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmZhbGxiYWNrVG9EZWZhdWx0RGIgPSBjb25maWcub3B0aW9ucy5mYWxsYmFja1RvRGVmYXVsdERiO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuaW5zdGFuY2VOYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5pbnN0YW5jZU5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuaW5zdGFuY2VOYW1lXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuaW5zdGFuY2VOYW1lID0gY29uZmlnLm9wdGlvbnMuaW5zdGFuY2VOYW1lO1xuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLnBvcnQgPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5pc29sYXRpb25MZXZlbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGFzc2VydFZhbGlkSXNvbGF0aW9uTGV2ZWwoY29uZmlnLm9wdGlvbnMuaXNvbGF0aW9uTGV2ZWwsICdjb25maWcub3B0aW9ucy5pc29sYXRpb25MZXZlbCcpO1xuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuaXNvbGF0aW9uTGV2ZWwgPSBjb25maWcub3B0aW9ucy5pc29sYXRpb25MZXZlbDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmxhbmd1YWdlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5sYW5ndWFnZSAhPT0gJ3N0cmluZycgJiYgY29uZmlnLm9wdGlvbnMubGFuZ3VhZ2UgIT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5sYW5ndWFnZVwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcgb3IgbnVsbC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMubGFuZ3VhZ2UgPSBjb25maWcub3B0aW9ucy5sYW5ndWFnZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmxvY2FsQWRkcmVzcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMubG9jYWxBZGRyZXNzICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmxvY2FsQWRkcmVzc1wiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmxvY2FsQWRkcmVzcyA9IGNvbmZpZy5vcHRpb25zLmxvY2FsQWRkcmVzcztcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLm11bHRpU3VibmV0RmFpbG92ZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLm11bHRpU3VibmV0RmFpbG92ZXIgIT09ICdib29sZWFuJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLm11bHRpU3VibmV0RmFpbG92ZXJcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMubXVsdGlTdWJuZXRGYWlsb3ZlciA9IGNvbmZpZy5vcHRpb25zLm11bHRpU3VibmV0RmFpbG92ZXI7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5wYWNrZXRTaXplICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5wYWNrZXRTaXplICE9PSAnbnVtYmVyJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLnBhY2tldFNpemVcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgbnVtYmVyLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5wYWNrZXRTaXplID0gY29uZmlnLm9wdGlvbnMucGFja2V0U2l6ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLnBvcnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLnBvcnQgIT09ICdudW1iZXInKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMucG9ydFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBudW1iZXIuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnLm9wdGlvbnMucG9ydCA8PSAwIHx8IGNvbmZpZy5vcHRpb25zLnBvcnQgPj0gNjU1MzYpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMucG9ydFwiIHByb3BlcnR5IG11c3QgYmUgPiAwIGFuZCA8IDY1NTM2Jyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLnBvcnQgPSBjb25maWcub3B0aW9ucy5wb3J0O1xuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmluc3RhbmNlTmFtZSA9IHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLnJlYWRPbmx5SW50ZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5yZWFkT25seUludGVudCAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMucmVhZE9ubHlJbnRlbnRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMucmVhZE9ubHlJbnRlbnQgPSBjb25maWcub3B0aW9ucy5yZWFkT25seUludGVudDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLnJlcXVlc3RUaW1lb3V0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5yZXF1ZXN0VGltZW91dCAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5yZXF1ZXN0VGltZW91dFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBudW1iZXIuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLnJlcXVlc3RUaW1lb3V0ID0gY29uZmlnLm9wdGlvbnMucmVxdWVzdFRpbWVvdXQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5tYXhSZXRyaWVzT25UcmFuc2llbnRFcnJvcnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLm1heFJldHJpZXNPblRyYW5zaWVudEVycm9ycyAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5tYXhSZXRyaWVzT25UcmFuc2llbnRFcnJvcnNcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgbnVtYmVyLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLm1heFJldHJpZXNPblRyYW5zaWVudEVycm9ycyA8IDApIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5tYXhSZXRyaWVzT25UcmFuc2llbnRFcnJvcnNcIiBwcm9wZXJ0eSBtdXN0IGJlIGVxdWFsIG9yIGdyZWF0ZXIgdGhhbiAwLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5tYXhSZXRyaWVzT25UcmFuc2llbnRFcnJvcnMgPSBjb25maWcub3B0aW9ucy5tYXhSZXRyaWVzT25UcmFuc2llbnRFcnJvcnM7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5jb25uZWN0aW9uUmV0cnlJbnRlcnZhbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuY29ubmVjdGlvblJldHJ5SW50ZXJ2YWwgIT09ICdudW1iZXInKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuY29ubmVjdGlvblJldHJ5SW50ZXJ2YWxcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgbnVtYmVyLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmNvbm5lY3Rpb25SZXRyeUludGVydmFsIDw9IDApIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5jb25uZWN0aW9uUmV0cnlJbnRlcnZhbFwiIHByb3BlcnR5IG11c3QgYmUgZ3JlYXRlciB0aGFuIDAuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmNvbm5lY3Rpb25SZXRyeUludGVydmFsID0gY29uZmlnLm9wdGlvbnMuY29ubmVjdGlvblJldHJ5SW50ZXJ2YWw7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5yb3dDb2xsZWN0aW9uT25Eb25lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5yb3dDb2xsZWN0aW9uT25Eb25lICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5yb3dDb2xsZWN0aW9uT25Eb25lXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4uJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLnJvd0NvbGxlY3Rpb25PbkRvbmUgPSBjb25maWcub3B0aW9ucy5yb3dDb2xsZWN0aW9uT25Eb25lO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMucm93Q29sbGVjdGlvbk9uUmVxdWVzdENvbXBsZXRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLnJvd0NvbGxlY3Rpb25PblJlcXVlc3RDb21wbGV0aW9uICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5yb3dDb2xsZWN0aW9uT25SZXF1ZXN0Q29tcGxldGlvblwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5yb3dDb2xsZWN0aW9uT25SZXF1ZXN0Q29tcGxldGlvbiA9IGNvbmZpZy5vcHRpb25zLnJvd0NvbGxlY3Rpb25PblJlcXVlc3RDb21wbGV0aW9uO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMudGRzVmVyc2lvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMudGRzVmVyc2lvbiAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy50ZHNWZXJzaW9uXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMudGRzVmVyc2lvbiA9IGNvbmZpZy5vcHRpb25zLnRkc1ZlcnNpb247XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy50ZXh0c2l6ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMudGV4dHNpemUgIT09ICdudW1iZXInICYmIGNvbmZpZy5vcHRpb25zLnRleHRzaXplICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMudGV4dHNpemVcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgbnVtYmVyIG9yIG51bGwuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnLm9wdGlvbnMudGV4dHNpemUgPiAyMTQ3NDgzNjQ3KSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMudGV4dHNpemVcIiBjYW5cXCd0IGJlIGdyZWF0ZXIgdGhhbiAyMTQ3NDgzNjQ3LicpO1xuICAgICAgICB9IGVsc2UgaWYgKGNvbmZpZy5vcHRpb25zLnRleHRzaXplIDwgLTEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy50ZXh0c2l6ZVwiIGNhblxcJ3QgYmUgc21hbGxlciB0aGFuIC0xLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy50ZXh0c2l6ZSA9IGNvbmZpZy5vcHRpb25zLnRleHRzaXplIHwgMDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLnRydXN0U2VydmVyQ2VydGlmaWNhdGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLnRydXN0U2VydmVyQ2VydGlmaWNhdGUgIT09ICdib29sZWFuJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLnRydXN0U2VydmVyQ2VydGlmaWNhdGVcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMudHJ1c3RTZXJ2ZXJDZXJ0aWZpY2F0ZSA9IGNvbmZpZy5vcHRpb25zLnRydXN0U2VydmVyQ2VydGlmaWNhdGU7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy51c2VDb2x1bW5OYW1lcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMudXNlQ29sdW1uTmFtZXMgIT09ICdib29sZWFuJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLnVzZUNvbHVtbk5hbWVzXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4uJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLnVzZUNvbHVtbk5hbWVzID0gY29uZmlnLm9wdGlvbnMudXNlQ29sdW1uTmFtZXM7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy51c2VVVEMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLnVzZVVUQyAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMudXNlVVRDXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4uJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLnVzZVVUQyA9IGNvbmZpZy5vcHRpb25zLnVzZVVUQztcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLndvcmtzdGF0aW9uSWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLndvcmtzdGF0aW9uSWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMud29ya3N0YXRpb25JZFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLndvcmtzdGF0aW9uSWQgPSBjb25maWcub3B0aW9ucy53b3Jrc3RhdGlvbklkO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMubG93ZXJDYXNlR3VpZHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmxvd2VyQ2FzZUd1aWRzICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5sb3dlckNhc2VHdWlkc1wiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5sb3dlckNhc2VHdWlkcyA9IGNvbmZpZy5vcHRpb25zLmxvd2VyQ2FzZUd1aWRzO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuc2VjdXJlQ29udGV4dE9wdGlvbnMgPSB0aGlzLmNvbmZpZy5vcHRpb25zLmNyeXB0b0NyZWRlbnRpYWxzRGV0YWlscztcbiAgICBpZiAodGhpcy5zZWN1cmVDb250ZXh0T3B0aW9ucy5zZWN1cmVPcHRpb25zID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIElmIHRoZSBjYWxsZXIgaGFzIG5vdCBzcGVjaWZpZWQgdGhlaXIgb3duIGBzZWN1cmVPcHRpb25zYCxcbiAgICAgIC8vIHdlIHNldCBgU1NMX09QX0RPTlRfSU5TRVJUX0VNUFRZX0ZSQUdNRU5UU2AgaGVyZS5cbiAgICAgIC8vIE9sZGVyIFNRTCBTZXJ2ZXIgaW5zdGFuY2VzIHJ1bm5pbmcgb24gb2xkZXIgV2luZG93cyB2ZXJzaW9ucyBoYXZlXG4gICAgICAvLyB0cm91YmxlIHdpdGggdGhlIEJFQVNUIHdvcmthcm91bmQgaW4gT3BlblNTTC5cbiAgICAgIC8vIEFzIEJFQVNUIGlzIGEgYnJvd3NlciBzcGVjaWZpYyBleHBsb2l0LCB3ZSBjYW4ganVzdCBkaXNhYmxlIHRoaXMgb3B0aW9uIGhlcmUuXG4gICAgICB0aGlzLnNlY3VyZUNvbnRleHRPcHRpb25zID0gT2JqZWN0LmNyZWF0ZSh0aGlzLnNlY3VyZUNvbnRleHRPcHRpb25zLCB7XG4gICAgICAgIHNlY3VyZU9wdGlvbnM6IHtcbiAgICAgICAgICB2YWx1ZTogY29uc3RhbnRzLlNTTF9PUF9ET05UX0lOU0VSVF9FTVBUWV9GUkFHTUVOVFNcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy5kZWJ1ZyA9IHRoaXMuY3JlYXRlRGVidWcoKTtcbiAgICB0aGlzLmluVHJhbnNhY3Rpb24gPSBmYWxzZTtcbiAgICB0aGlzLnRyYW5zYWN0aW9uRGVzY3JpcHRvcnMgPSBbQnVmZmVyLmZyb20oWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdKV07XG5cbiAgICAvLyAnYmVnaW5UcmFuc2FjdGlvbicsICdjb21taXRUcmFuc2FjdGlvbicgYW5kICdyb2xsYmFja1RyYW5zYWN0aW9uJ1xuICAgIC8vIGV2ZW50cyBhcmUgdXRpbGl6ZWQgdG8gbWFpbnRhaW4gaW5UcmFuc2FjdGlvbiBwcm9wZXJ0eSBzdGF0ZSB3aGljaCBpblxuICAgIC8vIHR1cm4gaXMgdXNlZCBpbiBtYW5hZ2luZyB0cmFuc2FjdGlvbnMuIFRoZXNlIGV2ZW50cyBhcmUgb25seSBmaXJlZCBmb3JcbiAgICAvLyBURFMgdmVyc2lvbiA3LjIgYW5kIGJleW9uZC4gVGhlIHByb3BlcnRpZXMgYmVsb3cgYXJlIHVzZWQgdG8gZW11bGF0ZVxuICAgIC8vIGVxdWl2YWxlbnQgYmVoYXZpb3IgZm9yIFREUyB2ZXJzaW9ucyBiZWZvcmUgNy4yLlxuICAgIHRoaXMudHJhbnNhY3Rpb25EZXB0aCA9IDA7XG4gICAgdGhpcy5pc1NxbEJhdGNoID0gZmFsc2U7XG4gICAgdGhpcy5jbG9zZWQgPSBmYWxzZTtcbiAgICB0aGlzLm1lc3NhZ2VCdWZmZXIgPSBCdWZmZXIuYWxsb2MoMCk7XG5cbiAgICB0aGlzLmN1clRyYW5zaWVudFJldHJ5Q291bnQgPSAwO1xuICAgIHRoaXMudHJhbnNpZW50RXJyb3JMb29rdXAgPSBuZXcgVHJhbnNpZW50RXJyb3JMb29rdXAoKTtcblxuICAgIHRoaXMuc3RhdGUgPSB0aGlzLlNUQVRFLklOSVRJQUxJWkVEO1xuXG4gICAgdGhpcy5fY2FuY2VsQWZ0ZXJSZXF1ZXN0U2VudCA9ICgpID0+IHtcbiAgICAgIHRoaXMubWVzc2FnZUlvLnNlbmRNZXNzYWdlKFRZUEUuQVRURU5USU9OKTtcbiAgICAgIHRoaXMuY3JlYXRlQ2FuY2VsVGltZXIoKTtcbiAgICB9O1xuICB9XG5cbiAgY29ubmVjdChjb25uZWN0TGlzdGVuZXI/OiAoZXJyPzogRXJyb3IpID0+IHZvaWQpIHtcbiAgICBpZiAodGhpcy5zdGF0ZSAhPT0gdGhpcy5TVEFURS5JTklUSUFMSVpFRCkge1xuICAgICAgdGhyb3cgbmV3IENvbm5lY3Rpb25FcnJvcignYC5jb25uZWN0YCBjYW4gbm90IGJlIGNhbGxlZCBvbiBhIENvbm5lY3Rpb24gaW4gYCcgKyB0aGlzLnN0YXRlLm5hbWUgKyAnYCBzdGF0ZS4nKTtcbiAgICB9XG5cbiAgICBpZiAoY29ubmVjdExpc3RlbmVyKSB7XG4gICAgICBjb25zdCBvbkNvbm5lY3QgPSAoZXJyPzogRXJyb3IpID0+IHtcbiAgICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcignZXJyb3InLCBvbkVycm9yKTtcbiAgICAgICAgY29ubmVjdExpc3RlbmVyKGVycik7XG4gICAgICB9O1xuXG4gICAgICBjb25zdCBvbkVycm9yID0gKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcignY29ubmVjdCcsIG9uQ29ubmVjdCk7XG4gICAgICAgIGNvbm5lY3RMaXN0ZW5lcihlcnIpO1xuICAgICAgfTtcblxuICAgICAgdGhpcy5vbmNlKCdjb25uZWN0Jywgb25Db25uZWN0KTtcbiAgICAgIHRoaXMub25jZSgnZXJyb3InLCBvbkVycm9yKTtcbiAgICB9XG5cbiAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkNPTk5FQ1RJTkcpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBzZXJ2ZXIgaGFzIHJlcG9ydGVkIHRoYXQgdGhlIGNoYXJzZXQgaGFzIGNoYW5nZWQuXG4gICAqL1xuICBvbihldmVudDogJ2NoYXJzZXRDaGFuZ2UnLCBsaXN0ZW5lcjogKGNoYXJzZXQ6IHN0cmluZykgPT4gdm9pZCk6IHRoaXNcblxuICAvKipcbiAgICogVGhlIGF0dGVtcHQgdG8gY29ubmVjdCBhbmQgdmFsaWRhdGUgaGFzIGNvbXBsZXRlZC5cbiAgICovXG4gIG9uKFxuICAgIGV2ZW50OiAnY29ubmVjdCcsXG4gICAgLyoqXG4gICAgICogQHBhcmFtIGVyciBJZiBzdWNjZXNzZnVsbHkgY29ubmVjdGVkLCB3aWxsIGJlIGZhbHNleS4gSWYgdGhlcmUgd2FzIGFcbiAgICAgKiAgIHByb2JsZW0gKHdpdGggZWl0aGVyIGNvbm5lY3Rpbmcgb3IgdmFsaWRhdGlvbiksIHdpbGwgYmUgYW4gW1tFcnJvcl1dIG9iamVjdC5cbiAgICAgKi9cbiAgICBsaXN0ZW5lcjogKGVycjogRXJyb3IgfCB1bmRlZmluZWQpID0+IHZvaWRcbiAgKTogdGhpc1xuXG4gIC8qKlxuICAgKiBUaGUgc2VydmVyIGhhcyByZXBvcnRlZCB0aGF0IHRoZSBhY3RpdmUgZGF0YWJhc2UgaGFzIGNoYW5nZWQuXG4gICAqIFRoaXMgbWF5IGJlIGFzIGEgcmVzdWx0IG9mIGEgc3VjY2Vzc2Z1bCBsb2dpbiwgb3IgYSBgdXNlYCBzdGF0ZW1lbnQuXG4gICAqL1xuICBvbihldmVudDogJ2RhdGFiYXNlQ2hhbmdlJywgbGlzdGVuZXI6IChkYXRhYmFzZU5hbWU6IHN0cmluZykgPT4gdm9pZCk6IHRoaXNcblxuICAvKipcbiAgICogQSBkZWJ1ZyBtZXNzYWdlIGlzIGF2YWlsYWJsZS4gSXQgbWF5IGJlIGxvZ2dlZCBvciBpZ25vcmVkLlxuICAgKi9cbiAgb24oZXZlbnQ6ICdkZWJ1ZycsIGxpc3RlbmVyOiAobWVzc2FnZVRleHQ6IHN0cmluZykgPT4gdm9pZCk6IHRoaXNcblxuICAvKipcbiAgICogSW50ZXJuYWwgZXJyb3Igb2NjdXJzLlxuICAgKi9cbiAgb24oZXZlbnQ6ICdlcnJvcicsIGxpc3RlbmVyOiAoZXJyOiBFcnJvcikgPT4gdm9pZCk6IHRoaXNcblxuICAvKipcbiAgICogVGhlIHNlcnZlciBoYXMgaXNzdWVkIGFuIGVycm9yIG1lc3NhZ2UuXG4gICAqL1xuICBvbihldmVudDogJ2Vycm9yTWVzc2FnZScsIGxpc3RlbmVyOiAobWVzc2FnZTogaW1wb3J0KCcuL3Rva2VuL3Rva2VuJykuRXJyb3JNZXNzYWdlVG9rZW4pID0+IHZvaWQpOiB0aGlzXG5cbiAgLyoqXG4gICAqIFRoZSBjb25uZWN0aW9uIGhhcyBlbmRlZC5cbiAgICpcbiAgICogVGhpcyBtYXkgYmUgYXMgYSByZXN1bHQgb2YgdGhlIGNsaWVudCBjYWxsaW5nIFtbY2xvc2VdXSwgdGhlIHNlcnZlclxuICAgKiBjbG9zaW5nIHRoZSBjb25uZWN0aW9uLCBvciBhIG5ldHdvcmsgZXJyb3IuXG4gICAqL1xuICBvbihldmVudDogJ2VuZCcsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKTogdGhpc1xuXG4gIC8qKlxuICAgKiBUaGUgc2VydmVyIGhhcyBpc3N1ZWQgYW4gaW5mb3JtYXRpb24gbWVzc2FnZS5cbiAgICovXG4gIG9uKGV2ZW50OiAnaW5mb01lc3NhZ2UnLCBsaXN0ZW5lcjogKG1lc3NhZ2U6IGltcG9ydCgnLi90b2tlbi90b2tlbicpLkluZm9NZXNzYWdlVG9rZW4pID0+IHZvaWQpOiB0aGlzXG5cbiAgLyoqXG4gICAqIFRoZSBzZXJ2ZXIgaGFzIHJlcG9ydGVkIHRoYXQgdGhlIGxhbmd1YWdlIGhhcyBjaGFuZ2VkLlxuICAgKi9cbiAgb24oZXZlbnQ6ICdsYW5ndWFnZUNoYW5nZScsIGxpc3RlbmVyOiAobGFuZ3VhZ2VOYW1lOiBzdHJpbmcpID0+IHZvaWQpOiB0aGlzXG5cbiAgLyoqXG4gICAqIFRoZSBjb25uZWN0aW9uIHdhcyByZXNldC5cbiAgICovXG4gIG9uKGV2ZW50OiAncmVzZXRDb25uZWN0aW9uJywgbGlzdGVuZXI6ICgpID0+IHZvaWQpOiB0aGlzXG5cbiAgLyoqXG4gICAqIEEgc2VjdXJlIGNvbm5lY3Rpb24gaGFzIGJlZW4gZXN0YWJsaXNoZWQuXG4gICAqL1xuICBvbihldmVudDogJ3NlY3VyZScsIGxpc3RlbmVyOiAoY2xlYXJ0ZXh0OiBpbXBvcnQoJ3RscycpLlRMU1NvY2tldCkgPT4gdm9pZCk6IHRoaXNcblxuICBvbihldmVudDogc3RyaW5nIHwgc3ltYm9sLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkKSB7XG4gICAgcmV0dXJuIHN1cGVyLm9uKGV2ZW50LCBsaXN0ZW5lcik7XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdjaGFyc2V0Q2hhbmdlJywgY2hhcnNldDogc3RyaW5nKTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdjb25uZWN0JywgZXJyb3I/OiBFcnJvcik6IGJvb2xlYW5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBlbWl0KGV2ZW50OiAnZGF0YWJhc2VDaGFuZ2UnLCBkYXRhYmFzZU5hbWU6IHN0cmluZyk6IGJvb2xlYW5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBlbWl0KGV2ZW50OiAnZGVidWcnLCBtZXNzYWdlVGV4dDogc3RyaW5nKTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdlcnJvcicsIGVycm9yOiBFcnJvcik6IGJvb2xlYW5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBlbWl0KGV2ZW50OiAnZXJyb3JNZXNzYWdlJywgbWVzc2FnZTogaW1wb3J0KCcuL3Rva2VuL3Rva2VuJykuRXJyb3JNZXNzYWdlVG9rZW4pOiBib29sZWFuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZW1pdChldmVudDogJ2VuZCcpOiBib29sZWFuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZW1pdChldmVudDogJ2luZm9NZXNzYWdlJywgbWVzc2FnZTogaW1wb3J0KCcuL3Rva2VuL3Rva2VuJykuSW5mb01lc3NhZ2VUb2tlbik6IGJvb2xlYW5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBlbWl0KGV2ZW50OiAnbGFuZ3VhZ2VDaGFuZ2UnLCBsYW5ndWFnZU5hbWU6IHN0cmluZyk6IGJvb2xlYW5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBlbWl0KGV2ZW50OiAnc2VjdXJlJywgY2xlYXJ0ZXh0OiBpbXBvcnQoJ3RscycpLlRMU1NvY2tldCk6IGJvb2xlYW5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBlbWl0KGV2ZW50OiAncmVyb3V0aW5nJyk6IGJvb2xlYW5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBlbWl0KGV2ZW50OiAncmVzZXRDb25uZWN0aW9uJyk6IGJvb2xlYW5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBlbWl0KGV2ZW50OiAncmV0cnknKTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdyb2xsYmFja1RyYW5zYWN0aW9uJyk6IGJvb2xlYW5cblxuICBlbWl0KGV2ZW50OiBzdHJpbmcgfCBzeW1ib2wsIC4uLmFyZ3M6IGFueVtdKSB7XG4gICAgcmV0dXJuIHN1cGVyLmVtaXQoZXZlbnQsIC4uLmFyZ3MpO1xuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlcyB0aGUgY29ubmVjdGlvbiB0byB0aGUgZGF0YWJhc2UuXG4gICAqXG4gICAqIFRoZSBbW0V2ZW50X2VuZF1dIHdpbGwgYmUgZW1pdHRlZCBvbmNlIHRoZSBjb25uZWN0aW9uIGhhcyBiZWVuIGNsb3NlZC5cbiAgICovXG4gIGNsb3NlKCkge1xuICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBpbml0aWFsaXNlQ29ubmVjdGlvbigpIHtcbiAgICBjb25zdCBzaWduYWwgPSB0aGlzLmNyZWF0ZUNvbm5lY3RUaW1lcigpO1xuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMucG9ydCkge1xuICAgICAgcmV0dXJuIHRoaXMuY29ubmVjdE9uUG9ydCh0aGlzLmNvbmZpZy5vcHRpb25zLnBvcnQsIHRoaXMuY29uZmlnLm9wdGlvbnMubXVsdGlTdWJuZXRGYWlsb3Zlciwgc2lnbmFsLCB0aGlzLmNvbmZpZy5vcHRpb25zLmNvbm5lY3Rvcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBpbnN0YW5jZUxvb2t1cCh7XG4gICAgICAgIHNlcnZlcjogdGhpcy5jb25maWcuc2VydmVyLFxuICAgICAgICBpbnN0YW5jZU5hbWU6IHRoaXMuY29uZmlnLm9wdGlvbnMuaW5zdGFuY2VOYW1lISxcbiAgICAgICAgdGltZW91dDogdGhpcy5jb25maWcub3B0aW9ucy5jb25uZWN0VGltZW91dCxcbiAgICAgICAgc2lnbmFsOiBzaWduYWxcbiAgICAgIH0pLnRoZW4oKHBvcnQpID0+IHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7XG4gICAgICAgICAgdGhpcy5jb25uZWN0T25Qb3J0KHBvcnQsIHRoaXMuY29uZmlnLm9wdGlvbnMubXVsdGlTdWJuZXRGYWlsb3Zlciwgc2lnbmFsLCB0aGlzLmNvbmZpZy5vcHRpb25zLmNvbm5lY3Rvcik7XG4gICAgICAgIH0pO1xuICAgICAgfSwgKGVycikgPT4ge1xuICAgICAgICB0aGlzLmNsZWFyQ29ubmVjdFRpbWVyKCk7XG4gICAgICAgIGlmIChlcnIubmFtZSA9PT0gJ0Fib3J0RXJyb3InKSB7XG4gICAgICAgICAgLy8gSWdub3JlIHRoZSBBYm9ydEVycm9yIGZvciBub3csIHRoaXMgaXMgc3RpbGwgaGFuZGxlZCBieSB0aGUgY29ubmVjdFRpbWVyIGZpcmluZ1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICAgIHRoaXMuZW1pdCgnY29ubmVjdCcsIG5ldyBDb25uZWN0aW9uRXJyb3IoZXJyLm1lc3NhZ2UsICdFSU5TVExPT0tVUCcpKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGNsZWFudXBDb25uZWN0aW9uKGNsZWFudXBUeXBlOiB0eXBlb2YgQ0xFQU5VUF9UWVBFW2tleW9mIHR5cGVvZiBDTEVBTlVQX1RZUEVdKSB7XG4gICAgaWYgKCF0aGlzLmNsb3NlZCkge1xuICAgICAgdGhpcy5jbGVhckNvbm5lY3RUaW1lcigpO1xuICAgICAgdGhpcy5jbGVhclJlcXVlc3RUaW1lcigpO1xuICAgICAgdGhpcy5jbGVhclJldHJ5VGltZXIoKTtcbiAgICAgIHRoaXMuY2xvc2VDb25uZWN0aW9uKCk7XG4gICAgICBpZiAoY2xlYW51cFR5cGUgPT09IENMRUFOVVBfVFlQRS5SRURJUkVDVCkge1xuICAgICAgICB0aGlzLmVtaXQoJ3Jlcm91dGluZycpO1xuICAgICAgfSBlbHNlIGlmIChjbGVhbnVwVHlwZSAhPT0gQ0xFQU5VUF9UWVBFLlJFVFJZKSB7XG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICAgIHRoaXMuZW1pdCgnZW5kJyk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZXF1ZXN0ID0gdGhpcy5yZXF1ZXN0O1xuICAgICAgaWYgKHJlcXVlc3QpIHtcbiAgICAgICAgY29uc3QgZXJyID0gbmV3IFJlcXVlc3RFcnJvcignQ29ubmVjdGlvbiBjbG9zZWQgYmVmb3JlIHJlcXVlc3QgY29tcGxldGVkLicsICdFQ0xPU0UnKTtcbiAgICAgICAgcmVxdWVzdC5jYWxsYmFjayhlcnIpO1xuICAgICAgICB0aGlzLnJlcXVlc3QgPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuY2xvc2VkID0gdHJ1ZTtcbiAgICAgIHRoaXMubG9naW5FcnJvciA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGNyZWF0ZURlYnVnKCkge1xuICAgIGNvbnN0IGRlYnVnID0gbmV3IERlYnVnKHRoaXMuY29uZmlnLm9wdGlvbnMuZGVidWcpO1xuICAgIGRlYnVnLm9uKCdkZWJ1ZycsIChtZXNzYWdlKSA9PiB7XG4gICAgICB0aGlzLmVtaXQoJ2RlYnVnJywgbWVzc2FnZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGRlYnVnO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBjcmVhdGVUb2tlblN0cmVhbVBhcnNlcihtZXNzYWdlOiBNZXNzYWdlLCBoYW5kbGVyOiBUb2tlbkhhbmRsZXIpIHtcbiAgICByZXR1cm4gbmV3IFRva2VuU3RyZWFtUGFyc2VyKG1lc3NhZ2UsIHRoaXMuZGVidWcsIGhhbmRsZXIsIHRoaXMuY29uZmlnLm9wdGlvbnMpO1xuICB9XG5cbiAgY29ubmVjdE9uUG9ydChwb3J0OiBudW1iZXIsIG11bHRpU3VibmV0RmFpbG92ZXI6IGJvb2xlYW4sIHNpZ25hbDogQWJvcnRTaWduYWwsIGN1c3RvbUNvbm5lY3Rvcj86ICgpID0+IFByb21pc2U8U29ja2V0Pikge1xuICAgIGNvbnN0IGNvbm5lY3RPcHRzID0ge1xuICAgICAgaG9zdDogdGhpcy5yb3V0aW5nRGF0YSA/IHRoaXMucm91dGluZ0RhdGEuc2VydmVyIDogdGhpcy5jb25maWcuc2VydmVyLFxuICAgICAgcG9ydDogdGhpcy5yb3V0aW5nRGF0YSA/IHRoaXMucm91dGluZ0RhdGEucG9ydCA6IHBvcnQsXG4gICAgICBsb2NhbEFkZHJlc3M6IHRoaXMuY29uZmlnLm9wdGlvbnMubG9jYWxBZGRyZXNzXG4gICAgfTtcblxuICAgIGNvbnN0IGNvbm5lY3QgPSBjdXN0b21Db25uZWN0b3IgfHwgKG11bHRpU3VibmV0RmFpbG92ZXIgPyBjb25uZWN0SW5QYXJhbGxlbCA6IGNvbm5lY3RJblNlcXVlbmNlKTtcblxuICAgIGNvbm5lY3QoY29ubmVjdE9wdHMsIGRucy5sb29rdXAsIHNpZ25hbCkudGhlbigoc29ja2V0KSA9PiB7XG4gICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHtcbiAgICAgICAgc29ja2V0Lm9uKCdlcnJvcicsIChlcnJvcikgPT4geyB0aGlzLnNvY2tldEVycm9yKGVycm9yKTsgfSk7XG4gICAgICAgIHNvY2tldC5vbignY2xvc2UnLCAoKSA9PiB7IHRoaXMuc29ja2V0Q2xvc2UoKTsgfSk7XG4gICAgICAgIHNvY2tldC5vbignZW5kJywgKCkgPT4geyB0aGlzLnNvY2tldEVuZCgpOyB9KTtcbiAgICAgICAgc29ja2V0LnNldEtlZXBBbGl2ZSh0cnVlLCBLRUVQX0FMSVZFX0lOSVRJQUxfREVMQVkpO1xuXG4gICAgICAgIHRoaXMubWVzc2FnZUlvID0gbmV3IE1lc3NhZ2VJTyhzb2NrZXQsIHRoaXMuY29uZmlnLm9wdGlvbnMucGFja2V0U2l6ZSwgdGhpcy5kZWJ1Zyk7XG4gICAgICAgIHRoaXMubWVzc2FnZUlvLm9uKCdzZWN1cmUnLCAoY2xlYXJ0ZXh0KSA9PiB7IHRoaXMuZW1pdCgnc2VjdXJlJywgY2xlYXJ0ZXh0KTsgfSk7XG5cbiAgICAgICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XG5cbiAgICAgICAgdGhpcy5jbG9zZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5kZWJ1Zy5sb2coJ2Nvbm5lY3RlZCB0byAnICsgdGhpcy5jb25maWcuc2VydmVyICsgJzonICsgdGhpcy5jb25maWcub3B0aW9ucy5wb3J0KTtcblxuICAgICAgICB0aGlzLnNlbmRQcmVMb2dpbigpO1xuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLlNFTlRfUFJFTE9HSU4pO1xuICAgICAgfSk7XG4gICAgfSwgKGVycikgPT4ge1xuICAgICAgdGhpcy5jbGVhckNvbm5lY3RUaW1lcigpO1xuICAgICAgaWYgKGVyci5uYW1lID09PSAnQWJvcnRFcnJvcicpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHsgdGhpcy5zb2NrZXRFcnJvcihlcnIpOyB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY2xvc2VDb25uZWN0aW9uKCkge1xuICAgIGlmICh0aGlzLnNvY2tldCkge1xuICAgICAgdGhpcy5zb2NrZXQuZGVzdHJveSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY3JlYXRlQ29ubmVjdFRpbWVyKCkge1xuICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gICAgdGhpcy5jb25uZWN0VGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGNvbnRyb2xsZXIuYWJvcnQoKTtcbiAgICAgIHRoaXMuY29ubmVjdFRpbWVvdXQoKTtcbiAgICB9LCB0aGlzLmNvbmZpZy5vcHRpb25zLmNvbm5lY3RUaW1lb3V0KTtcbiAgICByZXR1cm4gY29udHJvbGxlci5zaWduYWw7XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGNyZWF0ZUNhbmNlbFRpbWVyKCkge1xuICAgIHRoaXMuY2xlYXJDYW5jZWxUaW1lcigpO1xuICAgIGNvbnN0IHRpbWVvdXQgPSB0aGlzLmNvbmZpZy5vcHRpb25zLmNhbmNlbFRpbWVvdXQ7XG4gICAgaWYgKHRpbWVvdXQgPiAwKSB7XG4gICAgICB0aGlzLmNhbmNlbFRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHRoaXMuY2FuY2VsVGltZW91dCgpO1xuICAgICAgfSwgdGltZW91dCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBjcmVhdGVSZXF1ZXN0VGltZXIoKSB7XG4gICAgdGhpcy5jbGVhclJlcXVlc3RUaW1lcigpOyAvLyByZWxlYXNlIG9sZCB0aW1lciwganVzdCB0byBiZSBzYWZlXG4gICAgY29uc3QgcmVxdWVzdCA9IHRoaXMucmVxdWVzdCBhcyBSZXF1ZXN0O1xuICAgIGNvbnN0IHRpbWVvdXQgPSAocmVxdWVzdC50aW1lb3V0ICE9PSB1bmRlZmluZWQpID8gcmVxdWVzdC50aW1lb3V0IDogdGhpcy5jb25maWcub3B0aW9ucy5yZXF1ZXN0VGltZW91dDtcbiAgICBpZiAodGltZW91dCkge1xuICAgICAgdGhpcy5yZXF1ZXN0VGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgdGhpcy5yZXF1ZXN0VGltZW91dCgpO1xuICAgICAgfSwgdGltZW91dCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBjcmVhdGVSZXRyeVRpbWVyKCkge1xuICAgIHRoaXMuY2xlYXJSZXRyeVRpbWVyKCk7XG4gICAgdGhpcy5yZXRyeVRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLnJldHJ5VGltZW91dCgpO1xuICAgIH0sIHRoaXMuY29uZmlnLm9wdGlvbnMuY29ubmVjdGlvblJldHJ5SW50ZXJ2YWwpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBjb25uZWN0VGltZW91dCgpIHtcbiAgICBjb25zdCBtZXNzYWdlID0gYEZhaWxlZCB0byBjb25uZWN0IHRvICR7dGhpcy5jb25maWcuc2VydmVyfSR7dGhpcy5jb25maWcub3B0aW9ucy5wb3J0ID8gYDoke3RoaXMuY29uZmlnLm9wdGlvbnMucG9ydH1gIDogYFxcXFwke3RoaXMuY29uZmlnLm9wdGlvbnMuaW5zdGFuY2VOYW1lfWB9IGluICR7dGhpcy5jb25maWcub3B0aW9ucy5jb25uZWN0VGltZW91dH1tc2A7XG4gICAgdGhpcy5kZWJ1Zy5sb2cobWVzc2FnZSk7XG4gICAgdGhpcy5lbWl0KCdjb25uZWN0JywgbmV3IENvbm5lY3Rpb25FcnJvcihtZXNzYWdlLCAnRVRJTUVPVVQnKSk7XG4gICAgdGhpcy5jb25uZWN0VGltZXIgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KCdjb25uZWN0VGltZW91dCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBjYW5jZWxUaW1lb3V0KCkge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBgRmFpbGVkIHRvIGNhbmNlbCByZXF1ZXN0IGluICR7dGhpcy5jb25maWcub3B0aW9ucy5jYW5jZWxUaW1lb3V0fW1zYDtcbiAgICB0aGlzLmRlYnVnLmxvZyhtZXNzYWdlKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoJ3NvY2tldEVycm9yJywgbmV3IENvbm5lY3Rpb25FcnJvcihtZXNzYWdlLCAnRVRJTUVPVVQnKSk7XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIHJlcXVlc3RUaW1lb3V0KCkge1xuICAgIHRoaXMucmVxdWVzdFRpbWVyID0gdW5kZWZpbmVkO1xuICAgIGNvbnN0IHJlcXVlc3QgPSB0aGlzLnJlcXVlc3QhO1xuICAgIHJlcXVlc3QuY2FuY2VsKCk7XG4gICAgY29uc3QgdGltZW91dCA9IChyZXF1ZXN0LnRpbWVvdXQgIT09IHVuZGVmaW5lZCkgPyByZXF1ZXN0LnRpbWVvdXQgOiB0aGlzLmNvbmZpZy5vcHRpb25zLnJlcXVlc3RUaW1lb3V0O1xuICAgIGNvbnN0IG1lc3NhZ2UgPSAnVGltZW91dDogUmVxdWVzdCBmYWlsZWQgdG8gY29tcGxldGUgaW4gJyArIHRpbWVvdXQgKyAnbXMnO1xuICAgIHJlcXVlc3QuZXJyb3IgPSBuZXcgUmVxdWVzdEVycm9yKG1lc3NhZ2UsICdFVElNRU9VVCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICByZXRyeVRpbWVvdXQoKSB7XG4gICAgdGhpcy5yZXRyeVRpbWVyID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuZW1pdCgncmV0cnknKTtcbiAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkNPTk5FQ1RJTkcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBjbGVhckNvbm5lY3RUaW1lcigpIHtcbiAgICBpZiAodGhpcy5jb25uZWN0VGltZXIpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLmNvbm5lY3RUaW1lcik7XG4gICAgICB0aGlzLmNvbm5lY3RUaW1lciA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGNsZWFyQ2FuY2VsVGltZXIoKSB7XG4gICAgaWYgKHRoaXMuY2FuY2VsVGltZXIpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLmNhbmNlbFRpbWVyKTtcbiAgICAgIHRoaXMuY2FuY2VsVGltZXIgPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBjbGVhclJlcXVlc3RUaW1lcigpIHtcbiAgICBpZiAodGhpcy5yZXF1ZXN0VGltZXIpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLnJlcXVlc3RUaW1lcik7XG4gICAgICB0aGlzLnJlcXVlc3RUaW1lciA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGNsZWFyUmV0cnlUaW1lcigpIHtcbiAgICBpZiAodGhpcy5yZXRyeVRpbWVyKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5yZXRyeVRpbWVyKTtcbiAgICAgIHRoaXMucmV0cnlUaW1lciA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIHRyYW5zaXRpb25UbyhuZXdTdGF0ZTogU3RhdGUpIHtcbiAgICBpZiAodGhpcy5zdGF0ZSA9PT0gbmV3U3RhdGUpIHtcbiAgICAgIHRoaXMuZGVidWcubG9nKCdTdGF0ZSBpcyBhbHJlYWR5ICcgKyBuZXdTdGF0ZS5uYW1lKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zdGF0ZSAmJiB0aGlzLnN0YXRlLmV4aXQpIHtcbiAgICAgIHRoaXMuc3RhdGUuZXhpdC5jYWxsKHRoaXMsIG5ld1N0YXRlKTtcbiAgICB9XG5cbiAgICB0aGlzLmRlYnVnLmxvZygnU3RhdGUgY2hhbmdlOiAnICsgKHRoaXMuc3RhdGUgPyB0aGlzLnN0YXRlLm5hbWUgOiAndW5kZWZpbmVkJykgKyAnIC0+ICcgKyBuZXdTdGF0ZS5uYW1lKTtcbiAgICB0aGlzLnN0YXRlID0gbmV3U3RhdGU7XG5cbiAgICBpZiAodGhpcy5zdGF0ZS5lbnRlcikge1xuICAgICAgdGhpcy5zdGF0ZS5lbnRlci5hcHBseSh0aGlzKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGdldEV2ZW50SGFuZGxlcjxUIGV4dGVuZHMga2V5b2YgU3RhdGVbJ2V2ZW50cyddPihldmVudE5hbWU6IFQpOiBOb25OdWxsYWJsZTxTdGF0ZVsnZXZlbnRzJ11bVF0+IHtcbiAgICBjb25zdCBoYW5kbGVyID0gdGhpcy5zdGF0ZS5ldmVudHNbZXZlbnROYW1lXTtcblxuICAgIGlmICghaGFuZGxlcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBldmVudCAnJHtldmVudE5hbWV9JyBpbiBzdGF0ZSAnJHt0aGlzLnN0YXRlLm5hbWV9J2ApO1xuICAgIH1cblxuICAgIHJldHVybiBoYW5kbGVyITtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGlzcGF0Y2hFdmVudDxUIGV4dGVuZHMga2V5b2YgU3RhdGVbJ2V2ZW50cyddPihldmVudE5hbWU6IFQsIC4uLmFyZ3M6IFBhcmFtZXRlcnM8Tm9uTnVsbGFibGU8U3RhdGVbJ2V2ZW50cyddW1RdPj4pIHtcbiAgICBjb25zdCBoYW5kbGVyID0gdGhpcy5zdGF0ZS5ldmVudHNbZXZlbnROYW1lXSBhcyAoKHRoaXM6IENvbm5lY3Rpb24sIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkKSB8IHVuZGVmaW5lZDtcbiAgICBpZiAoaGFuZGxlcikge1xuICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lbWl0KCdlcnJvcicsIG5ldyBFcnJvcihgTm8gZXZlbnQgJyR7ZXZlbnROYW1lfScgaW4gc3RhdGUgJyR7dGhpcy5zdGF0ZS5uYW1lfSdgKSk7XG4gICAgICB0aGlzLmNsb3NlKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBzb2NrZXRFcnJvcihlcnJvcjogRXJyb3IpIHtcbiAgICBpZiAodGhpcy5zdGF0ZSA9PT0gdGhpcy5TVEFURS5DT05ORUNUSU5HIHx8IHRoaXMuc3RhdGUgPT09IHRoaXMuU1RBVEUuU0VOVF9UTFNTU0xORUdPVElBVElPTikge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGBGYWlsZWQgdG8gY29ubmVjdCB0byAke3RoaXMuY29uZmlnLnNlcnZlcn06JHt0aGlzLmNvbmZpZy5vcHRpb25zLnBvcnR9IC0gJHtlcnJvci5tZXNzYWdlfWA7XG4gICAgICB0aGlzLmRlYnVnLmxvZyhtZXNzYWdlKTtcbiAgICAgIHRoaXMuZW1pdCgnY29ubmVjdCcsIG5ldyBDb25uZWN0aW9uRXJyb3IobWVzc2FnZSwgJ0VTT0NLRVQnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBgQ29ubmVjdGlvbiBsb3N0IC0gJHtlcnJvci5tZXNzYWdlfWA7XG4gICAgICB0aGlzLmRlYnVnLmxvZyhtZXNzYWdlKTtcbiAgICAgIHRoaXMuZW1pdCgnZXJyb3InLCBuZXcgQ29ubmVjdGlvbkVycm9yKG1lc3NhZ2UsICdFU09DS0VUJykpO1xuICAgIH1cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoJ3NvY2tldEVycm9yJywgZXJyb3IpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBzb2NrZXRFbmQoKSB7XG4gICAgdGhpcy5kZWJ1Zy5sb2coJ3NvY2tldCBlbmRlZCcpO1xuICAgIGlmICh0aGlzLnN0YXRlICE9PSB0aGlzLlNUQVRFLkZJTkFMKSB7XG4gICAgICBjb25zdCBlcnJvcjogRXJyb3JXaXRoQ29kZSA9IG5ldyBFcnJvcignc29ja2V0IGhhbmcgdXAnKTtcbiAgICAgIGVycm9yLmNvZGUgPSAnRUNPTk5SRVNFVCc7XG4gICAgICB0aGlzLnNvY2tldEVycm9yKGVycm9yKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIHNvY2tldENsb3NlKCkge1xuICAgIHRoaXMuZGVidWcubG9nKCdjb25uZWN0aW9uIHRvICcgKyB0aGlzLmNvbmZpZy5zZXJ2ZXIgKyAnOicgKyB0aGlzLmNvbmZpZy5vcHRpb25zLnBvcnQgKyAnIGNsb3NlZCcpO1xuICAgIGlmICh0aGlzLnN0YXRlID09PSB0aGlzLlNUQVRFLlJFUk9VVElORykge1xuICAgICAgdGhpcy5kZWJ1Zy5sb2coJ1Jlcm91dGluZyB0byAnICsgdGhpcy5yb3V0aW5nRGF0YSEuc2VydmVyICsgJzonICsgdGhpcy5yb3V0aW5nRGF0YSEucG9ydCk7XG5cbiAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudCgncmVjb25uZWN0Jyk7XG4gICAgfSBlbHNlIGlmICh0aGlzLnN0YXRlID09PSB0aGlzLlNUQVRFLlRSQU5TSUVOVF9GQUlMVVJFX1JFVFJZKSB7XG4gICAgICBjb25zdCBzZXJ2ZXIgPSB0aGlzLnJvdXRpbmdEYXRhID8gdGhpcy5yb3V0aW5nRGF0YS5zZXJ2ZXIgOiB0aGlzLmNvbmZpZy5zZXJ2ZXI7XG4gICAgICBjb25zdCBwb3J0ID0gdGhpcy5yb3V0aW5nRGF0YSA/IHRoaXMucm91dGluZ0RhdGEucG9ydCA6IHRoaXMuY29uZmlnLm9wdGlvbnMucG9ydDtcbiAgICAgIHRoaXMuZGVidWcubG9nKCdSZXRyeSBhZnRlciB0cmFuc2llbnQgZmFpbHVyZSBjb25uZWN0aW5nIHRvICcgKyBzZXJ2ZXIgKyAnOicgKyBwb3J0KTtcblxuICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KCdyZXRyeScpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIHNlbmRQcmVMb2dpbigpIHtcbiAgICBjb25zdCBbICwgbWFqb3IsIG1pbm9yLCBidWlsZCBdID0gL14oXFxkKylcXC4oXFxkKylcXC4oXFxkKykvLmV4ZWModmVyc2lvbikgPz8gWyAnMC4wLjAnLCAnMCcsICcwJywgJzAnIF07XG5cbiAgICBjb25zdCBwYXlsb2FkID0gbmV3IFByZWxvZ2luUGF5bG9hZCh7XG4gICAgICBlbmNyeXB0OiB0aGlzLmNvbmZpZy5vcHRpb25zLmVuY3J5cHQsXG4gICAgICB2ZXJzaW9uOiB7IG1ham9yOiBOdW1iZXIobWFqb3IpLCBtaW5vcjogTnVtYmVyKG1pbm9yKSwgYnVpbGQ6IE51bWJlcihidWlsZCksIHN1YmJ1aWxkOiAwIH1cbiAgICB9KTtcblxuICAgIHRoaXMubWVzc2FnZUlvLnNlbmRNZXNzYWdlKFRZUEUuUFJFTE9HSU4sIHBheWxvYWQuZGF0YSk7XG4gICAgdGhpcy5kZWJ1Zy5wYXlsb2FkKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHBheWxvYWQudG9TdHJpbmcoJyAgJyk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIHNlbmRMb2dpbjdQYWNrZXQoKSB7XG4gICAgY29uc3QgcGF5bG9hZCA9IG5ldyBMb2dpbjdQYXlsb2FkKHtcbiAgICAgIHRkc1ZlcnNpb246IHZlcnNpb25zW3RoaXMuY29uZmlnLm9wdGlvbnMudGRzVmVyc2lvbl0sXG4gICAgICBwYWNrZXRTaXplOiB0aGlzLmNvbmZpZy5vcHRpb25zLnBhY2tldFNpemUsXG4gICAgICBjbGllbnRQcm9nVmVyOiAwLFxuICAgICAgY2xpZW50UGlkOiBwcm9jZXNzLnBpZCxcbiAgICAgIGNvbm5lY3Rpb25JZDogMCxcbiAgICAgIGNsaWVudFRpbWVab25lOiBuZXcgRGF0ZSgpLmdldFRpbWV6b25lT2Zmc2V0KCksXG4gICAgICBjbGllbnRMY2lkOiAweDAwMDAwNDA5XG4gICAgfSk7XG5cbiAgICBjb25zdCB7IGF1dGhlbnRpY2F0aW9uIH0gPSB0aGlzLmNvbmZpZztcbiAgICBzd2l0Y2ggKGF1dGhlbnRpY2F0aW9uLnR5cGUpIHtcbiAgICAgIGNhc2UgJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktcGFzc3dvcmQnOlxuICAgICAgICBwYXlsb2FkLmZlZEF1dGggPSB7XG4gICAgICAgICAgdHlwZTogJ0FEQUwnLFxuICAgICAgICAgIGVjaG86IHRoaXMuZmVkQXV0aFJlcXVpcmVkLFxuICAgICAgICAgIHdvcmtmbG93OiAnZGVmYXVsdCdcbiAgICAgICAgfTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktYWNjZXNzLXRva2VuJzpcbiAgICAgICAgcGF5bG9hZC5mZWRBdXRoID0ge1xuICAgICAgICAgIHR5cGU6ICdTRUNVUklUWVRPS0VOJyxcbiAgICAgICAgICBlY2hvOiB0aGlzLmZlZEF1dGhSZXF1aXJlZCxcbiAgICAgICAgICBmZWRBdXRoVG9rZW46IGF1dGhlbnRpY2F0aW9uLm9wdGlvbnMudG9rZW5cbiAgICAgICAgfTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktbXNpLXZtJzpcbiAgICAgIGNhc2UgJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktZGVmYXVsdCc6XG4gICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS1hcHAtc2VydmljZSc6XG4gICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXNlcnZpY2UtcHJpbmNpcGFsLXNlY3JldCc6XG4gICAgICAgIHBheWxvYWQuZmVkQXV0aCA9IHtcbiAgICAgICAgICB0eXBlOiAnQURBTCcsXG4gICAgICAgICAgZWNobzogdGhpcy5mZWRBdXRoUmVxdWlyZWQsXG4gICAgICAgICAgd29ya2Zsb3c6ICdpbnRlZ3JhdGVkJ1xuICAgICAgICB9O1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnbnRsbSc6XG4gICAgICAgIHBheWxvYWQuc3NwaSA9IGNyZWF0ZU5UTE1SZXF1ZXN0KHsgZG9tYWluOiBhdXRoZW50aWNhdGlvbi5vcHRpb25zLmRvbWFpbiB9KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHBheWxvYWQudXNlck5hbWUgPSBhdXRoZW50aWNhdGlvbi5vcHRpb25zLnVzZXJOYW1lO1xuICAgICAgICBwYXlsb2FkLnBhc3N3b3JkID0gYXV0aGVudGljYXRpb24ub3B0aW9ucy5wYXNzd29yZDtcbiAgICB9XG5cbiAgICBwYXlsb2FkLmhvc3RuYW1lID0gdGhpcy5jb25maWcub3B0aW9ucy53b3Jrc3RhdGlvbklkIHx8IG9zLmhvc3RuYW1lKCk7XG4gICAgcGF5bG9hZC5zZXJ2ZXJOYW1lID0gdGhpcy5yb3V0aW5nRGF0YSA/IHRoaXMucm91dGluZ0RhdGEuc2VydmVyIDogdGhpcy5jb25maWcuc2VydmVyO1xuICAgIHBheWxvYWQuYXBwTmFtZSA9IHRoaXMuY29uZmlnLm9wdGlvbnMuYXBwTmFtZSB8fCAnVGVkaW91cyc7XG4gICAgcGF5bG9hZC5saWJyYXJ5TmFtZSA9IGxpYnJhcnlOYW1lO1xuICAgIHBheWxvYWQubGFuZ3VhZ2UgPSB0aGlzLmNvbmZpZy5vcHRpb25zLmxhbmd1YWdlO1xuICAgIHBheWxvYWQuZGF0YWJhc2UgPSB0aGlzLmNvbmZpZy5vcHRpb25zLmRhdGFiYXNlO1xuICAgIHBheWxvYWQuY2xpZW50SWQgPSBCdWZmZXIuZnJvbShbMSwgMiwgMywgNCwgNSwgNl0pO1xuXG4gICAgcGF5bG9hZC5yZWFkT25seUludGVudCA9IHRoaXMuY29uZmlnLm9wdGlvbnMucmVhZE9ubHlJbnRlbnQ7XG4gICAgcGF5bG9hZC5pbml0RGJGYXRhbCA9ICF0aGlzLmNvbmZpZy5vcHRpb25zLmZhbGxiYWNrVG9EZWZhdWx0RGI7XG5cbiAgICB0aGlzLnJvdXRpbmdEYXRhID0gdW5kZWZpbmVkO1xuICAgIHRoaXMubWVzc2FnZUlvLnNlbmRNZXNzYWdlKFRZUEUuTE9HSU43LCBwYXlsb2FkLnRvQnVmZmVyKCkpO1xuXG4gICAgdGhpcy5kZWJ1Zy5wYXlsb2FkKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHBheWxvYWQudG9TdHJpbmcoJyAgJyk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIHNlbmRGZWRBdXRoVG9rZW5NZXNzYWdlKHRva2VuOiBzdHJpbmcpIHtcbiAgICBjb25zdCBhY2Nlc3NUb2tlbkxlbiA9IEJ1ZmZlci5ieXRlTGVuZ3RoKHRva2VuLCAndWNzMicpO1xuICAgIGNvbnN0IGRhdGEgPSBCdWZmZXIuYWxsb2MoOCArIGFjY2Vzc1Rva2VuTGVuKTtcbiAgICBsZXQgb2Zmc2V0ID0gMDtcbiAgICBvZmZzZXQgPSBkYXRhLndyaXRlVUludDMyTEUoYWNjZXNzVG9rZW5MZW4gKyA0LCBvZmZzZXQpO1xuICAgIG9mZnNldCA9IGRhdGEud3JpdGVVSW50MzJMRShhY2Nlc3NUb2tlbkxlbiwgb2Zmc2V0KTtcbiAgICBkYXRhLndyaXRlKHRva2VuLCBvZmZzZXQsICd1Y3MyJyk7XG4gICAgdGhpcy5tZXNzYWdlSW8uc2VuZE1lc3NhZ2UoVFlQRS5GRURBVVRIX1RPS0VOLCBkYXRhKTtcbiAgICAvLyBzZW50IHRoZSBmZWRBdXRoIHRva2VuIG1lc3NhZ2UsIHRoZSByZXN0IGlzIHNpbWlsYXIgdG8gc3RhbmRhcmQgbG9naW4gN1xuICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuU0VOVF9MT0dJTjdfV0lUSF9TVEFOREFSRF9MT0dJTik7XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIHNlbmRJbml0aWFsU3FsKCkge1xuICAgIGNvbnN0IHBheWxvYWQgPSBuZXcgU3FsQmF0Y2hQYXlsb2FkKHRoaXMuZ2V0SW5pdGlhbFNxbCgpLCB0aGlzLmN1cnJlbnRUcmFuc2FjdGlvbkRlc2NyaXB0b3IoKSwgdGhpcy5jb25maWcub3B0aW9ucyk7XG5cbiAgICBjb25zdCBtZXNzYWdlID0gbmV3IE1lc3NhZ2UoeyB0eXBlOiBUWVBFLlNRTF9CQVRDSCB9KTtcbiAgICB0aGlzLm1lc3NhZ2VJby5vdXRnb2luZ01lc3NhZ2VTdHJlYW0ud3JpdGUobWVzc2FnZSk7XG4gICAgUmVhZGFibGUuZnJvbShwYXlsb2FkKS5waXBlKG1lc3NhZ2UpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBnZXRJbml0aWFsU3FsKCkge1xuICAgIGNvbnN0IG9wdGlvbnMgPSBbXTtcblxuICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lOdWxsID09PSB0cnVlKSB7XG4gICAgICBvcHRpb25zLnB1c2goJ3NldCBhbnNpX251bGxzIG9uJyk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lOdWxsID09PSBmYWxzZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgYW5zaV9udWxscyBvZmYnKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbERlZmF1bHQgPT09IHRydWUpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IGFuc2lfbnVsbF9kZmx0X29uIG9uJyk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lOdWxsRGVmYXVsdCA9PT0gZmFsc2UpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IGFuc2lfbnVsbF9kZmx0X29uIG9mZicpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lQYWRkaW5nID09PSB0cnVlKSB7XG4gICAgICBvcHRpb25zLnB1c2goJ3NldCBhbnNpX3BhZGRpbmcgb24nKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaVBhZGRpbmcgPT09IGZhbHNlKSB7XG4gICAgICBvcHRpb25zLnB1c2goJ3NldCBhbnNpX3BhZGRpbmcgb2ZmJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaVdhcm5pbmdzID09PSB0cnVlKSB7XG4gICAgICBvcHRpb25zLnB1c2goJ3NldCBhbnNpX3dhcm5pbmdzIG9uJyk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lXYXJuaW5ncyA9PT0gZmFsc2UpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IGFuc2lfd2FybmluZ3Mgb2ZmJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQXJpdGhBYm9ydCA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgYXJpdGhhYm9ydCBvbicpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVBcml0aEFib3J0ID09PSBmYWxzZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgYXJpdGhhYm9ydCBvZmYnKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVDb25jYXROdWxsWWllbGRzTnVsbCA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgY29uY2F0X251bGxfeWllbGRzX251bGwgb24nKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQ29uY2F0TnVsbFlpZWxkc051bGwgPT09IGZhbHNlKSB7XG4gICAgICBvcHRpb25zLnB1c2goJ3NldCBjb25jYXRfbnVsbF95aWVsZHNfbnVsbCBvZmYnKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVDdXJzb3JDbG9zZU9uQ29tbWl0ID09PSB0cnVlKSB7XG4gICAgICBvcHRpb25zLnB1c2goJ3NldCBjdXJzb3JfY2xvc2Vfb25fY29tbWl0IG9uJyk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUN1cnNvckNsb3NlT25Db21taXQgPT09IGZhbHNlKSB7XG4gICAgICBvcHRpb25zLnB1c2goJ3NldCBjdXJzb3JfY2xvc2Vfb25fY29tbWl0IG9mZicpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmRhdGVmaXJzdCAhPT0gbnVsbCkge1xuICAgICAgb3B0aW9ucy5wdXNoKGBzZXQgZGF0ZWZpcnN0ICR7dGhpcy5jb25maWcub3B0aW9ucy5kYXRlZmlyc3R9YCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZGF0ZUZvcm1hdCAhPT0gbnVsbCkge1xuICAgICAgb3B0aW9ucy5wdXNoKGBzZXQgZGF0ZWZvcm1hdCAke3RoaXMuY29uZmlnLm9wdGlvbnMuZGF0ZUZvcm1hdH1gKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVJbXBsaWNpdFRyYW5zYWN0aW9ucyA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgaW1wbGljaXRfdHJhbnNhY3Rpb25zIG9uJyk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUltcGxpY2l0VHJhbnNhY3Rpb25zID09PSBmYWxzZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgaW1wbGljaXRfdHJhbnNhY3Rpb25zIG9mZicpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmxhbmd1YWdlICE9PSBudWxsKSB7XG4gICAgICBvcHRpb25zLnB1c2goYHNldCBsYW5ndWFnZSAke3RoaXMuY29uZmlnLm9wdGlvbnMubGFuZ3VhZ2V9YCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlTnVtZXJpY1JvdW5kYWJvcnQgPT09IHRydWUpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IG51bWVyaWNfcm91bmRhYm9ydCBvbicpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVOdW1lcmljUm91bmRhYm9ydCA9PT0gZmFsc2UpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IG51bWVyaWNfcm91bmRhYm9ydCBvZmYnKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVRdW90ZWRJZGVudGlmaWVyID09PSB0cnVlKSB7XG4gICAgICBvcHRpb25zLnB1c2goJ3NldCBxdW90ZWRfaWRlbnRpZmllciBvbicpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVRdW90ZWRJZGVudGlmaWVyID09PSBmYWxzZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgcXVvdGVkX2lkZW50aWZpZXIgb2ZmJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMudGV4dHNpemUgIT09IG51bGwpIHtcbiAgICAgIG9wdGlvbnMucHVzaChgc2V0IHRleHRzaXplICR7dGhpcy5jb25maWcub3B0aW9ucy50ZXh0c2l6ZX1gKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy5jb25uZWN0aW9uSXNvbGF0aW9uTGV2ZWwgIT09IG51bGwpIHtcbiAgICAgIG9wdGlvbnMucHVzaChgc2V0IHRyYW5zYWN0aW9uIGlzb2xhdGlvbiBsZXZlbCAke3RoaXMuZ2V0SXNvbGF0aW9uTGV2ZWxUZXh0KHRoaXMuY29uZmlnLm9wdGlvbnMuY29ubmVjdGlvbklzb2xhdGlvbkxldmVsKX1gKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy5hYm9ydFRyYW5zYWN0aW9uT25FcnJvciA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgeGFjdF9hYm9ydCBvbicpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5jb25maWcub3B0aW9ucy5hYm9ydFRyYW5zYWN0aW9uT25FcnJvciA9PT0gZmFsc2UpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IHhhY3RfYWJvcnQgb2ZmJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9wdGlvbnMuam9pbignXFxuJyk7XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIHByb2Nlc3NlZEluaXRpYWxTcWwoKSB7XG4gICAgdGhpcy5jbGVhckNvbm5lY3RUaW1lcigpO1xuICAgIHRoaXMuZW1pdCgnY29ubmVjdCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4ZWN1dGUgdGhlIFNRTCBiYXRjaCByZXByZXNlbnRlZCBieSBbW1JlcXVlc3RdXS5cbiAgICogVGhlcmUgaXMgbm8gcGFyYW0gc3VwcG9ydCwgYW5kIHVubGlrZSBbW1JlcXVlc3QuZXhlY1NxbF1dLFxuICAgKiBpdCBpcyBub3QgbGlrZWx5IHRoYXQgU1FMIFNlcnZlciB3aWxsIHJldXNlIHRoZSBleGVjdXRpb24gcGxhbiBpdCBnZW5lcmF0ZXMgZm9yIHRoZSBTUUwuXG4gICAqXG4gICAqIEluIGFsbW9zdCBhbGwgY2FzZXMsIFtbUmVxdWVzdC5leGVjU3FsXV0gd2lsbCBiZSBhIGJldHRlciBjaG9pY2UuXG4gICAqXG4gICAqIEBwYXJhbSByZXF1ZXN0IEEgW1tSZXF1ZXN0XV0gb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgcmVxdWVzdC5cbiAgICovXG4gIGV4ZWNTcWxCYXRjaChyZXF1ZXN0OiBSZXF1ZXN0KSB7XG4gICAgdGhpcy5tYWtlUmVxdWVzdChyZXF1ZXN0LCBUWVBFLlNRTF9CQVRDSCwgbmV3IFNxbEJhdGNoUGF5bG9hZChyZXF1ZXN0LnNxbFRleHRPclByb2NlZHVyZSEsIHRoaXMuY3VycmVudFRyYW5zYWN0aW9uRGVzY3JpcHRvcigpLCB0aGlzLmNvbmZpZy5vcHRpb25zKSk7XG4gIH1cblxuICAvKipcbiAgICogIEV4ZWN1dGUgdGhlIFNRTCByZXByZXNlbnRlZCBieSBbW1JlcXVlc3RdXS5cbiAgICpcbiAgICogQXMgYHNwX2V4ZWN1dGVzcWxgIGlzIHVzZWQgdG8gZXhlY3V0ZSB0aGUgU1FMLCBpZiB0aGUgc2FtZSBTUUwgaXMgZXhlY3V0ZWQgbXVsdGlwbGVzIHRpbWVzXG4gICAqIHVzaW5nIHRoaXMgZnVuY3Rpb24sIHRoZSBTUUwgU2VydmVyIHF1ZXJ5IG9wdGltaXplciBpcyBsaWtlbHkgdG8gcmV1c2UgdGhlIGV4ZWN1dGlvbiBwbGFuIGl0IGdlbmVyYXRlc1xuICAgKiBmb3IgdGhlIGZpcnN0IGV4ZWN1dGlvbi4gVGhpcyBtYXkgYWxzbyByZXN1bHQgaW4gU1FMIHNlcnZlciB0cmVhdGluZyB0aGUgcmVxdWVzdCBsaWtlIGEgc3RvcmVkIHByb2NlZHVyZVxuICAgKiB3aGljaCBjYW4gcmVzdWx0IGluIHRoZSBbW0V2ZW50X2RvbmVJblByb2NdXSBvciBbW0V2ZW50X2RvbmVQcm9jXV0gZXZlbnRzIGJlaW5nIGVtaXR0ZWQgaW5zdGVhZCBvZiB0aGVcbiAgICogW1tFdmVudF9kb25lXV0gZXZlbnQgeW91IG1pZ2h0IGV4cGVjdC4gVXNpbmcgW1tleGVjU3FsQmF0Y2hdXSB3aWxsIHByZXZlbnQgdGhpcyBmcm9tIG9jY3VycmluZyBidXQgbWF5IGhhdmUgYSBuZWdhdGl2ZSBwZXJmb3JtYW5jZSBpbXBhY3QuXG4gICAqXG4gICAqIEJld2FyZSBvZiB0aGUgd2F5IHRoYXQgc2NvcGluZyBydWxlcyBhcHBseSwgYW5kIGhvdyB0aGV5IG1heSBbYWZmZWN0IGxvY2FsIHRlbXAgdGFibGVzXShodHRwOi8vd2VibG9ncy5zcWx0ZWFtLmNvbS9tbGFkZW5wL2FyY2hpdmUvMjAwNi8xMS8wMy8xNzE5Ny5hc3B4KVxuICAgKiBJZiB5b3UncmUgcnVubmluZyBpbiB0byBzY29waW5nIGlzc3VlcywgdGhlbiBbW2V4ZWNTcWxCYXRjaF1dIG1heSBiZSBhIGJldHRlciBjaG9pY2UuXG4gICAqIFNlZSBhbHNvIFtpc3N1ZSAjMjRdKGh0dHBzOi8vZ2l0aHViLmNvbS9wZWtpbS90ZWRpb3VzL2lzc3Vlcy8yNClcbiAgICpcbiAgICogQHBhcmFtIHJlcXVlc3QgQSBbW1JlcXVlc3RdXSBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSByZXF1ZXN0LlxuICAgKi9cbiAgZXhlY1NxbChyZXF1ZXN0OiBSZXF1ZXN0KSB7XG4gICAgdHJ5IHtcbiAgICAgIHJlcXVlc3QudmFsaWRhdGVQYXJhbWV0ZXJzKHRoaXMuZGF0YWJhc2VDb2xsYXRpb24pO1xuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIHJlcXVlc3QuZXJyb3IgPSBlcnJvcjtcblxuICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7XG4gICAgICAgIHRoaXMuZGVidWcubG9nKGVycm9yLm1lc3NhZ2UpO1xuICAgICAgICByZXF1ZXN0LmNhbGxiYWNrKGVycm9yKTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgcGFyYW1ldGVyczogUGFyYW1ldGVyW10gPSBbXTtcblxuICAgIHBhcmFtZXRlcnMucHVzaCh7XG4gICAgICB0eXBlOiBUWVBFUy5OVmFyQ2hhcixcbiAgICAgIG5hbWU6ICdzdGF0ZW1lbnQnLFxuICAgICAgdmFsdWU6IHJlcXVlc3Quc3FsVGV4dE9yUHJvY2VkdXJlLFxuICAgICAgb3V0cHV0OiBmYWxzZSxcbiAgICAgIGxlbmd0aDogdW5kZWZpbmVkLFxuICAgICAgcHJlY2lzaW9uOiB1bmRlZmluZWQsXG4gICAgICBzY2FsZTogdW5kZWZpbmVkXG4gICAgfSk7XG5cbiAgICBpZiAocmVxdWVzdC5wYXJhbWV0ZXJzLmxlbmd0aCkge1xuICAgICAgcGFyYW1ldGVycy5wdXNoKHtcbiAgICAgICAgdHlwZTogVFlQRVMuTlZhckNoYXIsXG4gICAgICAgIG5hbWU6ICdwYXJhbXMnLFxuICAgICAgICB2YWx1ZTogcmVxdWVzdC5tYWtlUGFyYW1zUGFyYW1ldGVyKHJlcXVlc3QucGFyYW1ldGVycyksXG4gICAgICAgIG91dHB1dDogZmFsc2UsXG4gICAgICAgIGxlbmd0aDogdW5kZWZpbmVkLFxuICAgICAgICBwcmVjaXNpb246IHVuZGVmaW5lZCxcbiAgICAgICAgc2NhbGU6IHVuZGVmaW5lZFxuICAgICAgfSk7XG5cbiAgICAgIHBhcmFtZXRlcnMucHVzaCguLi5yZXF1ZXN0LnBhcmFtZXRlcnMpO1xuICAgIH1cblxuICAgIHRoaXMubWFrZVJlcXVlc3QocmVxdWVzdCwgVFlQRS5SUENfUkVRVUVTVCwgbmV3IFJwY1JlcXVlc3RQYXlsb2FkKCdzcF9leGVjdXRlc3FsJywgcGFyYW1ldGVycywgdGhpcy5jdXJyZW50VHJhbnNhY3Rpb25EZXNjcmlwdG9yKCksIHRoaXMuY29uZmlnLm9wdGlvbnMsIHRoaXMuZGF0YWJhc2VDb2xsYXRpb24pKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IEJ1bGtMb2FkIGluc3RhbmNlLlxuICAgKlxuICAgKiBAcGFyYW0gdGFibGUgVGhlIG5hbWUgb2YgdGhlIHRhYmxlIHRvIGJ1bGstaW5zZXJ0IGludG8uXG4gICAqIEBwYXJhbSBvcHRpb25zIEEgc2V0IG9mIGJ1bGsgbG9hZCBvcHRpb25zLlxuICAgKi9cbiAgbmV3QnVsa0xvYWQodGFibGU6IHN0cmluZywgY2FsbGJhY2s6IEJ1bGtMb2FkQ2FsbGJhY2spOiBCdWxrTG9hZFxuICBuZXdCdWxrTG9hZCh0YWJsZTogc3RyaW5nLCBvcHRpb25zOiBCdWxrTG9hZE9wdGlvbnMsIGNhbGxiYWNrOiBCdWxrTG9hZENhbGxiYWNrKTogQnVsa0xvYWRcbiAgbmV3QnVsa0xvYWQodGFibGU6IHN0cmluZywgY2FsbGJhY2tPck9wdGlvbnM6IEJ1bGtMb2FkT3B0aW9ucyB8IEJ1bGtMb2FkQ2FsbGJhY2ssIGNhbGxiYWNrPzogQnVsa0xvYWRDYWxsYmFjaykge1xuICAgIGxldCBvcHRpb25zOiBCdWxrTG9hZE9wdGlvbnM7XG5cbiAgICBpZiAoY2FsbGJhY2sgPT09IHVuZGVmaW5lZCkge1xuICAgICAgY2FsbGJhY2sgPSBjYWxsYmFja09yT3B0aW9ucyBhcyBCdWxrTG9hZENhbGxiYWNrO1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH0gZWxzZSB7XG4gICAgICBvcHRpb25zID0gY2FsbGJhY2tPck9wdGlvbnMgYXMgQnVsa0xvYWRPcHRpb25zO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wib3B0aW9uc1wiIGFyZ3VtZW50IG11c3QgYmUgYW4gb2JqZWN0Jyk7XG4gICAgfVxuICAgIHJldHVybiBuZXcgQnVsa0xvYWQodGFibGUsIHRoaXMuZGF0YWJhc2VDb2xsYXRpb24sIHRoaXMuY29uZmlnLm9wdGlvbnMsIG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGVjdXRlIGEgW1tCdWxrTG9hZF1dLlxuICAgKlxuICAgKiBgYGBqc1xuICAgKiAvLyBXZSB3YW50IHRvIHBlcmZvcm0gYSBidWxrIGxvYWQgaW50byBhIHRhYmxlIHdpdGggdGhlIGZvbGxvd2luZyBmb3JtYXQ6XG4gICAqIC8vIENSRUFURSBUQUJMRSBlbXBsb3llZXMgKGZpcnN0X25hbWUgbnZhcmNoYXIoMjU1KSwgbGFzdF9uYW1lIG52YXJjaGFyKDI1NSksIGRheV9vZl9iaXJ0aCBkYXRlKTtcbiAgICpcbiAgICogY29uc3QgYnVsa0xvYWQgPSBjb25uZWN0aW9uLm5ld0J1bGtMb2FkKCdlbXBsb3llZXMnLCAoZXJyLCByb3dDb3VudCkgPT4ge1xuICAgKiAgIC8vIC4uLlxuICAgKiB9KTtcbiAgICpcbiAgICogLy8gRmlyc3QsIHdlIG5lZWQgdG8gc3BlY2lmeSB0aGUgY29sdW1ucyB0aGF0IHdlIHdhbnQgdG8gd3JpdGUgdG8sXG4gICAqIC8vIGFuZCB0aGVpciBkZWZpbml0aW9ucy4gVGhlc2UgZGVmaW5pdGlvbnMgbXVzdCBtYXRjaCB0aGUgYWN0dWFsIHRhYmxlLFxuICAgKiAvLyBvdGhlcndpc2UgdGhlIGJ1bGsgbG9hZCB3aWxsIGZhaWwuXG4gICAqIGJ1bGtMb2FkLmFkZENvbHVtbignZmlyc3RfbmFtZScsIFRZUEVTLk5WYXJjaGFyLCB7IG51bGxhYmxlOiBmYWxzZSB9KTtcbiAgICogYnVsa0xvYWQuYWRkQ29sdW1uKCdsYXN0X25hbWUnLCBUWVBFUy5OVmFyY2hhciwgeyBudWxsYWJsZTogZmFsc2UgfSk7XG4gICAqIGJ1bGtMb2FkLmFkZENvbHVtbignZGF0ZV9vZl9iaXJ0aCcsIFRZUEVTLkRhdGUsIHsgbnVsbGFibGU6IGZhbHNlIH0pO1xuICAgKlxuICAgKiAvLyBFeGVjdXRlIGEgYnVsayBsb2FkIHdpdGggYSBwcmVkZWZpbmVkIGxpc3Qgb2Ygcm93cy5cbiAgICogLy9cbiAgICogLy8gTm90ZSB0aGF0IHRoZXNlIHJvd3MgYXJlIGhlbGQgaW4gbWVtb3J5IHVudGlsIHRoZVxuICAgKiAvLyBidWxrIGxvYWQgd2FzIHBlcmZvcm1lZCwgc28gaWYgeW91IG5lZWQgdG8gd3JpdGUgYSBsYXJnZVxuICAgKiAvLyBudW1iZXIgb2Ygcm93cyAoZS5nLiBieSByZWFkaW5nIGZyb20gYSBDU1YgZmlsZSksXG4gICAqIC8vIHBhc3NpbmcgYW4gYEFzeW5jSXRlcmFibGVgIGlzIGFkdmlzYWJsZSB0byBrZWVwIG1lbW9yeSB1c2FnZSBsb3cuXG4gICAqIGNvbm5lY3Rpb24uZXhlY0J1bGtMb2FkKGJ1bGtMb2FkLCBbXG4gICAqICAgeyAnZmlyc3RfbmFtZSc6ICdTdGV2ZScsICdsYXN0X25hbWUnOiAnSm9icycsICdkYXlfb2ZfYmlydGgnOiBuZXcgRGF0ZSgnMDItMjQtMTk1NScpIH0sXG4gICAqICAgeyAnZmlyc3RfbmFtZSc6ICdCaWxsJywgJ2xhc3RfbmFtZSc6ICdHYXRlcycsICdkYXlfb2ZfYmlydGgnOiBuZXcgRGF0ZSgnMTAtMjgtMTk1NScpIH1cbiAgICogXSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gYnVsa0xvYWQgQSBwcmV2aW91c2x5IGNyZWF0ZWQgW1tCdWxrTG9hZF1dLlxuICAgKiBAcGFyYW0gcm93cyBBIFtbSXRlcmFibGVdXSBvciBbW0FzeW5jSXRlcmFibGVdXSB0aGF0IGNvbnRhaW5zIHRoZSByb3dzIHRoYXQgc2hvdWxkIGJlIGJ1bGsgbG9hZGVkLlxuICAgKi9cbiAgZXhlY0J1bGtMb2FkKGJ1bGtMb2FkOiBCdWxrTG9hZCwgcm93czogQXN5bmNJdGVyYWJsZTx1bmtub3duW10gfCB7IFtjb2x1bW5OYW1lOiBzdHJpbmddOiB1bmtub3duIH0+IHwgSXRlcmFibGU8dW5rbm93bltdIHwgeyBbY29sdW1uTmFtZTogc3RyaW5nXTogdW5rbm93biB9Pik6IHZvaWRcblxuICBleGVjQnVsa0xvYWQoYnVsa0xvYWQ6IEJ1bGtMb2FkLCByb3dzPzogQXN5bmNJdGVyYWJsZTx1bmtub3duW10gfCB7IFtjb2x1bW5OYW1lOiBzdHJpbmddOiB1bmtub3duIH0+IHwgSXRlcmFibGU8dW5rbm93bltdIHwgeyBbY29sdW1uTmFtZTogc3RyaW5nXTogdW5rbm93biB9Pikge1xuICAgIGJ1bGtMb2FkLmV4ZWN1dGlvblN0YXJ0ZWQgPSB0cnVlO1xuXG4gICAgaWYgKHJvd3MpIHtcbiAgICAgIGlmIChidWxrTG9hZC5zdHJlYW1pbmdNb2RlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNvbm5lY3Rpb24uZXhlY0J1bGtMb2FkIGNhbid0IGJlIGNhbGxlZCB3aXRoIGEgQnVsa0xvYWQgdGhhdCB3YXMgcHV0IGluIHN0cmVhbWluZyBtb2RlLlwiKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGJ1bGtMb2FkLmZpcnN0Um93V3JpdHRlbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb25uZWN0aW9uLmV4ZWNCdWxrTG9hZCBjYW4ndCBiZSBjYWxsZWQgd2l0aCBhIEJ1bGtMb2FkIHRoYXQgYWxyZWFkeSBoYXMgcm93cyB3cml0dGVuIHRvIGl0LlwiKTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgcm93U3RyZWFtID0gUmVhZGFibGUuZnJvbShyb3dzKTtcblxuICAgICAgLy8gRGVzdHJveSB0aGUgcGFja2V0IHRyYW5zZm9ybSBpZiBhbiBlcnJvciBoYXBwZW5zIGluIHRoZSByb3cgc3RyZWFtLFxuICAgICAgLy8gZS5nLiBpZiBhbiBlcnJvciBpcyB0aHJvd24gZnJvbSB3aXRoaW4gYSBnZW5lcmF0b3Igb3Igc3RyZWFtLlxuICAgICAgcm93U3RyZWFtLm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgYnVsa0xvYWQucm93VG9QYWNrZXRUcmFuc2Zvcm0uZGVzdHJveShlcnIpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIERlc3Ryb3kgdGhlIHJvdyBzdHJlYW0gaWYgYW4gZXJyb3IgaGFwcGVucyBpbiB0aGUgcGFja2V0IHRyYW5zZm9ybSxcbiAgICAgIC8vIGUuZy4gaWYgdGhlIGJ1bGsgbG9hZCBpcyBjYW5jZWxsZWQuXG4gICAgICBidWxrTG9hZC5yb3dUb1BhY2tldFRyYW5zZm9ybS5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICAgIHJvd1N0cmVhbS5kZXN0cm95KGVycik7XG4gICAgICB9KTtcblxuICAgICAgcm93U3RyZWFtLnBpcGUoYnVsa0xvYWQucm93VG9QYWNrZXRUcmFuc2Zvcm0pO1xuICAgIH0gZWxzZSBpZiAoIWJ1bGtMb2FkLnN0cmVhbWluZ01vZGUpIHtcbiAgICAgIC8vIElmIHRoZSBidWxrbG9hZCB3YXMgbm90IHB1dCBpbnRvIHN0cmVhbWluZyBtb2RlIGJ5IHRoZSB1c2VyLFxuICAgICAgLy8gd2UgZW5kIHRoZSByb3dUb1BhY2tldFRyYW5zZm9ybSBoZXJlIGZvciB0aGVtLlxuICAgICAgLy9cbiAgICAgIC8vIElmIGl0IHdhcyBwdXQgaW50byBzdHJlYW1pbmcgbW9kZSwgaXQncyB0aGUgdXNlcidzIHJlc3BvbnNpYmlsaXR5XG4gICAgICAvLyB0byBlbmQgdGhlIHN0cmVhbS5cbiAgICAgIGJ1bGtMb2FkLnJvd1RvUGFja2V0VHJhbnNmb3JtLmVuZCgpO1xuICAgIH1cblxuICAgIGNvbnN0IG9uQ2FuY2VsID0gKCkgPT4ge1xuICAgICAgcmVxdWVzdC5jYW5jZWwoKTtcbiAgICB9O1xuXG4gICAgY29uc3QgcGF5bG9hZCA9IG5ldyBCdWxrTG9hZFBheWxvYWQoYnVsa0xvYWQpO1xuXG4gICAgY29uc3QgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KGJ1bGtMb2FkLmdldEJ1bGtJbnNlcnRTcWwoKSwgKGVycm9yOiAoRXJyb3IgJiB7IGNvZGU/OiBzdHJpbmcgfSkgfCBudWxsIHwgdW5kZWZpbmVkKSA9PiB7XG4gICAgICBidWxrTG9hZC5yZW1vdmVMaXN0ZW5lcignY2FuY2VsJywgb25DYW5jZWwpO1xuXG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgaWYgKGVycm9yLmNvZGUgPT09ICdVTktOT1dOJykge1xuICAgICAgICAgIGVycm9yLm1lc3NhZ2UgKz0gJyBUaGlzIGlzIGxpa2VseSBiZWNhdXNlIHRoZSBzY2hlbWEgb2YgdGhlIEJ1bGtMb2FkIGRvZXMgbm90IG1hdGNoIHRoZSBzY2hlbWEgb2YgdGhlIHRhYmxlIHlvdSBhcmUgYXR0ZW1wdGluZyB0byBpbnNlcnQgaW50by4nO1xuICAgICAgICB9XG4gICAgICAgIGJ1bGtMb2FkLmVycm9yID0gZXJyb3I7XG4gICAgICAgIGJ1bGtMb2FkLmNhbGxiYWNrKGVycm9yKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aGlzLm1ha2VSZXF1ZXN0KGJ1bGtMb2FkLCBUWVBFLkJVTEtfTE9BRCwgcGF5bG9hZCk7XG4gICAgfSk7XG5cbiAgICBidWxrTG9hZC5vbmNlKCdjYW5jZWwnLCBvbkNhbmNlbCk7XG5cbiAgICB0aGlzLmV4ZWNTcWxCYXRjaChyZXF1ZXN0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcmVwYXJlIHRoZSBTUUwgcmVwcmVzZW50ZWQgYnkgdGhlIHJlcXVlc3QuXG4gICAqXG4gICAqIFRoZSByZXF1ZXN0IGNhbiB0aGVuIGJlIHVzZWQgaW4gc3Vic2VxdWVudCBjYWxscyB0b1xuICAgKiBbW2V4ZWN1dGVdXSBhbmQgW1t1bnByZXBhcmVdXVxuICAgKlxuICAgKiBAcGFyYW0gcmVxdWVzdCBBIFtbUmVxdWVzdF1dIG9iamVjdCByZXByZXNlbnRpbmcgdGhlIHJlcXVlc3QuXG4gICAqICAgUGFyYW1ldGVycyBvbmx5IHJlcXVpcmUgYSBuYW1lIGFuZCB0eXBlLiBQYXJhbWV0ZXIgdmFsdWVzIGFyZSBpZ25vcmVkLlxuICAgKi9cbiAgcHJlcGFyZShyZXF1ZXN0OiBSZXF1ZXN0KSB7XG4gICAgY29uc3QgcGFyYW1ldGVyczogUGFyYW1ldGVyW10gPSBbXTtcblxuICAgIHBhcmFtZXRlcnMucHVzaCh7XG4gICAgICB0eXBlOiBUWVBFUy5JbnQsXG4gICAgICBuYW1lOiAnaGFuZGxlJyxcbiAgICAgIHZhbHVlOiB1bmRlZmluZWQsXG4gICAgICBvdXRwdXQ6IHRydWUsXG4gICAgICBsZW5ndGg6IHVuZGVmaW5lZCxcbiAgICAgIHByZWNpc2lvbjogdW5kZWZpbmVkLFxuICAgICAgc2NhbGU6IHVuZGVmaW5lZFxuICAgIH0pO1xuXG4gICAgcGFyYW1ldGVycy5wdXNoKHtcbiAgICAgIHR5cGU6IFRZUEVTLk5WYXJDaGFyLFxuICAgICAgbmFtZTogJ3BhcmFtcycsXG4gICAgICB2YWx1ZTogcmVxdWVzdC5wYXJhbWV0ZXJzLmxlbmd0aCA/IHJlcXVlc3QubWFrZVBhcmFtc1BhcmFtZXRlcihyZXF1ZXN0LnBhcmFtZXRlcnMpIDogbnVsbCxcbiAgICAgIG91dHB1dDogZmFsc2UsXG4gICAgICBsZW5ndGg6IHVuZGVmaW5lZCxcbiAgICAgIHByZWNpc2lvbjogdW5kZWZpbmVkLFxuICAgICAgc2NhbGU6IHVuZGVmaW5lZFxuICAgIH0pO1xuXG4gICAgcGFyYW1ldGVycy5wdXNoKHtcbiAgICAgIHR5cGU6IFRZUEVTLk5WYXJDaGFyLFxuICAgICAgbmFtZTogJ3N0bXQnLFxuICAgICAgdmFsdWU6IHJlcXVlc3Quc3FsVGV4dE9yUHJvY2VkdXJlLFxuICAgICAgb3V0cHV0OiBmYWxzZSxcbiAgICAgIGxlbmd0aDogdW5kZWZpbmVkLFxuICAgICAgcHJlY2lzaW9uOiB1bmRlZmluZWQsXG4gICAgICBzY2FsZTogdW5kZWZpbmVkXG4gICAgfSk7XG5cbiAgICByZXF1ZXN0LnByZXBhcmluZyA9IHRydWU7XG4gICAgLy8gVE9ETzogV2UgbmVlZCB0byBjbGVhbiB1cCB0aGlzIGV2ZW50IGhhbmRsZXIsIG90aGVyd2lzZSB0aGlzIGxlYWtzIG1lbW9yeVxuICAgIHJlcXVlc3Qub24oJ3JldHVyblZhbHVlJywgKG5hbWU6IHN0cmluZywgdmFsdWU6IGFueSkgPT4ge1xuICAgICAgaWYgKG5hbWUgPT09ICdoYW5kbGUnKSB7XG4gICAgICAgIHJlcXVlc3QuaGFuZGxlID0gdmFsdWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXF1ZXN0LmVycm9yID0gbmV3IFJlcXVlc3RFcnJvcihgVGVkaW91cyA+IFVuZXhwZWN0ZWQgb3V0cHV0IHBhcmFtZXRlciAke25hbWV9IGZyb20gc3BfcHJlcGFyZWApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5tYWtlUmVxdWVzdChyZXF1ZXN0LCBUWVBFLlJQQ19SRVFVRVNULCBuZXcgUnBjUmVxdWVzdFBheWxvYWQoJ3NwX3ByZXBhcmUnLCBwYXJhbWV0ZXJzLCB0aGlzLmN1cnJlbnRUcmFuc2FjdGlvbkRlc2NyaXB0b3IoKSwgdGhpcy5jb25maWcub3B0aW9ucywgdGhpcy5kYXRhYmFzZUNvbGxhdGlvbikpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbGVhc2UgdGhlIFNRTCBTZXJ2ZXIgcmVzb3VyY2VzIGFzc29jaWF0ZWQgd2l0aCBhIHByZXZpb3VzbHkgcHJlcGFyZWQgcmVxdWVzdC5cbiAgICpcbiAgICogQHBhcmFtIHJlcXVlc3QgQSBbW1JlcXVlc3RdXSBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSByZXF1ZXN0LlxuICAgKiAgIFBhcmFtZXRlcnMgb25seSByZXF1aXJlIGEgbmFtZSBhbmQgdHlwZS5cbiAgICogICBQYXJhbWV0ZXIgdmFsdWVzIGFyZSBpZ25vcmVkLlxuICAgKi9cbiAgdW5wcmVwYXJlKHJlcXVlc3Q6IFJlcXVlc3QpIHtcbiAgICBjb25zdCBwYXJhbWV0ZXJzOiBQYXJhbWV0ZXJbXSA9IFtdO1xuXG4gICAgcGFyYW1ldGVycy5wdXNoKHtcbiAgICAgIHR5cGU6IFRZUEVTLkludCxcbiAgICAgIG5hbWU6ICdoYW5kbGUnLFxuICAgICAgLy8gVE9ETzogQWJvcnQgaWYgYHJlcXVlc3QuaGFuZGxlYCBpcyBub3Qgc2V0XG4gICAgICB2YWx1ZTogcmVxdWVzdC5oYW5kbGUsXG4gICAgICBvdXRwdXQ6IGZhbHNlLFxuICAgICAgbGVuZ3RoOiB1bmRlZmluZWQsXG4gICAgICBwcmVjaXNpb246IHVuZGVmaW5lZCxcbiAgICAgIHNjYWxlOiB1bmRlZmluZWRcbiAgICB9KTtcblxuICAgIHRoaXMubWFrZVJlcXVlc3QocmVxdWVzdCwgVFlQRS5SUENfUkVRVUVTVCwgbmV3IFJwY1JlcXVlc3RQYXlsb2FkKCdzcF91bnByZXBhcmUnLCBwYXJhbWV0ZXJzLCB0aGlzLmN1cnJlbnRUcmFuc2FjdGlvbkRlc2NyaXB0b3IoKSwgdGhpcy5jb25maWcub3B0aW9ucywgdGhpcy5kYXRhYmFzZUNvbGxhdGlvbikpO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4ZWN1dGUgcHJldmlvdXNseSBwcmVwYXJlZCBTUUwsIHVzaW5nIHRoZSBzdXBwbGllZCBwYXJhbWV0ZXJzLlxuICAgKlxuICAgKiBAcGFyYW0gcmVxdWVzdCBBIHByZXZpb3VzbHkgcHJlcGFyZWQgW1tSZXF1ZXN0XV0uXG4gICAqIEBwYXJhbSBwYXJhbWV0ZXJzICBBbiBvYmplY3Qgd2hvc2UgbmFtZXMgY29ycmVzcG9uZCB0byB0aGUgbmFtZXMgb2ZcbiAgICogICBwYXJhbWV0ZXJzIHRoYXQgd2VyZSBhZGRlZCB0byB0aGUgW1tSZXF1ZXN0XV0gYmVmb3JlIGl0IHdhcyBwcmVwYXJlZC5cbiAgICogICBUaGUgb2JqZWN0J3MgdmFsdWVzIGFyZSBwYXNzZWQgYXMgdGhlIHBhcmFtZXRlcnMnIHZhbHVlcyB3aGVuIHRoZVxuICAgKiAgIHJlcXVlc3QgaXMgZXhlY3V0ZWQuXG4gICAqL1xuICBleGVjdXRlKHJlcXVlc3Q6IFJlcXVlc3QsIHBhcmFtZXRlcnM/OiB7IFtrZXk6IHN0cmluZ106IHVua25vd24gfSkge1xuICAgIGNvbnN0IGV4ZWN1dGVQYXJhbWV0ZXJzOiBQYXJhbWV0ZXJbXSA9IFtdO1xuXG4gICAgZXhlY3V0ZVBhcmFtZXRlcnMucHVzaCh7XG4gICAgICB0eXBlOiBUWVBFUy5JbnQsXG4gICAgICBuYW1lOiAnaGFuZGxlJyxcbiAgICAgIC8vIFRPRE86IEFib3J0IGlmIGByZXF1ZXN0LmhhbmRsZWAgaXMgbm90IHNldFxuICAgICAgdmFsdWU6IHJlcXVlc3QuaGFuZGxlLFxuICAgICAgb3V0cHV0OiBmYWxzZSxcbiAgICAgIGxlbmd0aDogdW5kZWZpbmVkLFxuICAgICAgcHJlY2lzaW9uOiB1bmRlZmluZWQsXG4gICAgICBzY2FsZTogdW5kZWZpbmVkXG4gICAgfSk7XG5cbiAgICB0cnkge1xuICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHJlcXVlc3QucGFyYW1ldGVycy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBjb25zdCBwYXJhbWV0ZXIgPSByZXF1ZXN0LnBhcmFtZXRlcnNbaV07XG5cbiAgICAgICAgZXhlY3V0ZVBhcmFtZXRlcnMucHVzaCh7XG4gICAgICAgICAgLi4ucGFyYW1ldGVyLFxuICAgICAgICAgIHZhbHVlOiBwYXJhbWV0ZXIudHlwZS52YWxpZGF0ZShwYXJhbWV0ZXJzID8gcGFyYW1ldGVyc1twYXJhbWV0ZXIubmFtZV0gOiBudWxsLCB0aGlzLmRhdGFiYXNlQ29sbGF0aW9uKVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICByZXF1ZXN0LmVycm9yID0gZXJyb3I7XG5cbiAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICB0aGlzLmRlYnVnLmxvZyhlcnJvci5tZXNzYWdlKTtcbiAgICAgICAgcmVxdWVzdC5jYWxsYmFjayhlcnJvcik7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMubWFrZVJlcXVlc3QocmVxdWVzdCwgVFlQRS5SUENfUkVRVUVTVCwgbmV3IFJwY1JlcXVlc3RQYXlsb2FkKCdzcF9leGVjdXRlJywgZXhlY3V0ZVBhcmFtZXRlcnMsIHRoaXMuY3VycmVudFRyYW5zYWN0aW9uRGVzY3JpcHRvcigpLCB0aGlzLmNvbmZpZy5vcHRpb25zLCB0aGlzLmRhdGFiYXNlQ29sbGF0aW9uKSk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbCBhIHN0b3JlZCBwcm9jZWR1cmUgcmVwcmVzZW50ZWQgYnkgW1tSZXF1ZXN0XV0uXG4gICAqXG4gICAqIEBwYXJhbSByZXF1ZXN0IEEgW1tSZXF1ZXN0XV0gb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgcmVxdWVzdC5cbiAgICovXG4gIGNhbGxQcm9jZWR1cmUocmVxdWVzdDogUmVxdWVzdCkge1xuICAgIHRyeSB7XG4gICAgICByZXF1ZXN0LnZhbGlkYXRlUGFyYW1ldGVycyh0aGlzLmRhdGFiYXNlQ29sbGF0aW9uKTtcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICByZXF1ZXN0LmVycm9yID0gZXJyb3I7XG5cbiAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICB0aGlzLmRlYnVnLmxvZyhlcnJvci5tZXNzYWdlKTtcbiAgICAgICAgcmVxdWVzdC5jYWxsYmFjayhlcnJvcik7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMubWFrZVJlcXVlc3QocmVxdWVzdCwgVFlQRS5SUENfUkVRVUVTVCwgbmV3IFJwY1JlcXVlc3RQYXlsb2FkKHJlcXVlc3Quc3FsVGV4dE9yUHJvY2VkdXJlISwgcmVxdWVzdC5wYXJhbWV0ZXJzLCB0aGlzLmN1cnJlbnRUcmFuc2FjdGlvbkRlc2NyaXB0b3IoKSwgdGhpcy5jb25maWcub3B0aW9ucywgdGhpcy5kYXRhYmFzZUNvbGxhdGlvbikpO1xuICB9XG5cbiAgLyoqXG4gICAqIFN0YXJ0IGEgdHJhbnNhY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKiBAcGFyYW0gbmFtZSBBIHN0cmluZyByZXByZXNlbnRpbmcgYSBuYW1lIHRvIGFzc29jaWF0ZSB3aXRoIHRoZSB0cmFuc2FjdGlvbi5cbiAgICogICBPcHRpb25hbCwgYW5kIGRlZmF1bHRzIHRvIGFuIGVtcHR5IHN0cmluZy4gUmVxdWlyZWQgd2hlbiBgaXNvbGF0aW9uTGV2ZWxgXG4gICAqICAgaXMgcHJlc2VudC5cbiAgICogQHBhcmFtIGlzb2xhdGlvbkxldmVsIFRoZSBpc29sYXRpb24gbGV2ZWwgdGhhdCB0aGUgdHJhbnNhY3Rpb24gaXMgdG8gYmUgcnVuIHdpdGguXG4gICAqXG4gICAqICAgVGhlIGlzb2xhdGlvbiBsZXZlbHMgYXJlIGF2YWlsYWJsZSBmcm9tIGByZXF1aXJlKCd0ZWRpb3VzJykuSVNPTEFUSU9OX0xFVkVMYC5cbiAgICogICAqIGBSRUFEX1VOQ09NTUlUVEVEYFxuICAgKiAgICogYFJFQURfQ09NTUlUVEVEYFxuICAgKiAgICogYFJFUEVBVEFCTEVfUkVBRGBcbiAgICogICAqIGBTRVJJQUxJWkFCTEVgXG4gICAqICAgKiBgU05BUFNIT1RgXG4gICAqXG4gICAqICAgT3B0aW9uYWwsIGFuZCBkZWZhdWx0cyB0byB0aGUgQ29ubmVjdGlvbidzIGlzb2xhdGlvbiBsZXZlbC5cbiAgICovXG4gIGJlZ2luVHJhbnNhY3Rpb24oY2FsbGJhY2s6IEJlZ2luVHJhbnNhY3Rpb25DYWxsYmFjaywgbmFtZSA9ICcnLCBpc29sYXRpb25MZXZlbCA9IHRoaXMuY29uZmlnLm9wdGlvbnMuaXNvbGF0aW9uTGV2ZWwpIHtcbiAgICBhc3NlcnRWYWxpZElzb2xhdGlvbkxldmVsKGlzb2xhdGlvbkxldmVsLCAnaXNvbGF0aW9uTGV2ZWwnKTtcblxuICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gbmV3IFRyYW5zYWN0aW9uKG5hbWUsIGlzb2xhdGlvbkxldmVsKTtcblxuICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLnRkc1ZlcnNpb24gPCAnN18yJykge1xuICAgICAgcmV0dXJuIHRoaXMuZXhlY1NxbEJhdGNoKG5ldyBSZXF1ZXN0KCdTRVQgVFJBTlNBQ1RJT04gSVNPTEFUSU9OIExFVkVMICcgKyAodHJhbnNhY3Rpb24uaXNvbGF0aW9uTGV2ZWxUb1RTUUwoKSkgKyAnO0JFR0lOIFRSQU4gJyArIHRyYW5zYWN0aW9uLm5hbWUsIChlcnIpID0+IHtcbiAgICAgICAgdGhpcy50cmFuc2FjdGlvbkRlcHRoKys7XG4gICAgICAgIGlmICh0aGlzLnRyYW5zYWN0aW9uRGVwdGggPT09IDEpIHtcbiAgICAgICAgICB0aGlzLmluVHJhbnNhY3Rpb24gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICB9KSk7XG4gICAgfVxuXG4gICAgY29uc3QgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KHVuZGVmaW5lZCwgKGVycikgPT4ge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKGVyciwgdGhpcy5jdXJyZW50VHJhbnNhY3Rpb25EZXNjcmlwdG9yKCkpO1xuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLm1ha2VSZXF1ZXN0KHJlcXVlc3QsIFRZUEUuVFJBTlNBQ1RJT05fTUFOQUdFUiwgdHJhbnNhY3Rpb24uYmVnaW5QYXlsb2FkKHRoaXMuY3VycmVudFRyYW5zYWN0aW9uRGVzY3JpcHRvcigpKSk7XG4gIH1cblxuICAvKipcbiAgICogQ29tbWl0IGEgdHJhbnNhY3Rpb24uXG4gICAqXG4gICAqIFRoZXJlIHNob3VsZCBiZSBhbiBhY3RpdmUgdHJhbnNhY3Rpb24gLSB0aGF0IGlzLCBbW2JlZ2luVHJhbnNhY3Rpb25dXVxuICAgKiBzaG91bGQgaGF2ZSBiZWVuIHByZXZpb3VzbHkgY2FsbGVkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICogQHBhcmFtIG5hbWUgQSBzdHJpbmcgcmVwcmVzZW50aW5nIGEgbmFtZSB0byBhc3NvY2lhdGUgd2l0aCB0aGUgdHJhbnNhY3Rpb24uXG4gICAqICAgT3B0aW9uYWwsIGFuZCBkZWZhdWx0cyB0byBhbiBlbXB0eSBzdHJpbmcuIFJlcXVpcmVkIHdoZW4gYGlzb2xhdGlvbkxldmVsYGlzIHByZXNlbnQuXG4gICAqL1xuICBjb21taXRUcmFuc2FjdGlvbihjYWxsYmFjazogQ29tbWl0VHJhbnNhY3Rpb25DYWxsYmFjaywgbmFtZSA9ICcnKSB7XG4gICAgY29uc3QgdHJhbnNhY3Rpb24gPSBuZXcgVHJhbnNhY3Rpb24obmFtZSk7XG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMudGRzVmVyc2lvbiA8ICc3XzInKSB7XG4gICAgICByZXR1cm4gdGhpcy5leGVjU3FsQmF0Y2gobmV3IFJlcXVlc3QoJ0NPTU1JVCBUUkFOICcgKyB0cmFuc2FjdGlvbi5uYW1lLCAoZXJyKSA9PiB7XG4gICAgICAgIHRoaXMudHJhbnNhY3Rpb25EZXB0aC0tO1xuICAgICAgICBpZiAodGhpcy50cmFuc2FjdGlvbkRlcHRoID09PSAwKSB7XG4gICAgICAgICAgdGhpcy5pblRyYW5zYWN0aW9uID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgfSkpO1xuICAgIH1cbiAgICBjb25zdCByZXF1ZXN0ID0gbmV3IFJlcXVlc3QodW5kZWZpbmVkLCBjYWxsYmFjayk7XG4gICAgcmV0dXJuIHRoaXMubWFrZVJlcXVlc3QocmVxdWVzdCwgVFlQRS5UUkFOU0FDVElPTl9NQU5BR0VSLCB0cmFuc2FjdGlvbi5jb21taXRQYXlsb2FkKHRoaXMuY3VycmVudFRyYW5zYWN0aW9uRGVzY3JpcHRvcigpKSk7XG4gIH1cblxuICAvKipcbiAgICogUm9sbGJhY2sgYSB0cmFuc2FjdGlvbi5cbiAgICpcbiAgICogVGhlcmUgc2hvdWxkIGJlIGFuIGFjdGl2ZSB0cmFuc2FjdGlvbiAtIHRoYXQgaXMsIFtbYmVnaW5UcmFuc2FjdGlvbl1dXG4gICAqIHNob3VsZCBoYXZlIGJlZW4gcHJldmlvdXNseSBjYWxsZWQuXG4gICAqXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKiBAcGFyYW0gbmFtZSBBIHN0cmluZyByZXByZXNlbnRpbmcgYSBuYW1lIHRvIGFzc29jaWF0ZSB3aXRoIHRoZSB0cmFuc2FjdGlvbi5cbiAgICogICBPcHRpb25hbCwgYW5kIGRlZmF1bHRzIHRvIGFuIGVtcHR5IHN0cmluZy5cbiAgICogICBSZXF1aXJlZCB3aGVuIGBpc29sYXRpb25MZXZlbGAgaXMgcHJlc2VudC5cbiAgICovXG4gIHJvbGxiYWNrVHJhbnNhY3Rpb24oY2FsbGJhY2s6IFJvbGxiYWNrVHJhbnNhY3Rpb25DYWxsYmFjaywgbmFtZSA9ICcnKSB7XG4gICAgY29uc3QgdHJhbnNhY3Rpb24gPSBuZXcgVHJhbnNhY3Rpb24obmFtZSk7XG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMudGRzVmVyc2lvbiA8ICc3XzInKSB7XG4gICAgICByZXR1cm4gdGhpcy5leGVjU3FsQmF0Y2gobmV3IFJlcXVlc3QoJ1JPTExCQUNLIFRSQU4gJyArIHRyYW5zYWN0aW9uLm5hbWUsIChlcnIpID0+IHtcbiAgICAgICAgdGhpcy50cmFuc2FjdGlvbkRlcHRoLS07XG4gICAgICAgIGlmICh0aGlzLnRyYW5zYWN0aW9uRGVwdGggPT09IDApIHtcbiAgICAgICAgICB0aGlzLmluVHJhbnNhY3Rpb24gPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgfSkpO1xuICAgIH1cbiAgICBjb25zdCByZXF1ZXN0ID0gbmV3IFJlcXVlc3QodW5kZWZpbmVkLCBjYWxsYmFjayk7XG4gICAgcmV0dXJuIHRoaXMubWFrZVJlcXVlc3QocmVxdWVzdCwgVFlQRS5UUkFOU0FDVElPTl9NQU5BR0VSLCB0cmFuc2FjdGlvbi5yb2xsYmFja1BheWxvYWQodGhpcy5jdXJyZW50VHJhbnNhY3Rpb25EZXNjcmlwdG9yKCkpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgYSBzYXZlcG9pbnQgd2l0aGluIGEgdHJhbnNhY3Rpb24uXG4gICAqXG4gICAqIFRoZXJlIHNob3VsZCBiZSBhbiBhY3RpdmUgdHJhbnNhY3Rpb24gLSB0aGF0IGlzLCBbW2JlZ2luVHJhbnNhY3Rpb25dXVxuICAgKiBzaG91bGQgaGF2ZSBiZWVuIHByZXZpb3VzbHkgY2FsbGVkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICogQHBhcmFtIG5hbWUgQSBzdHJpbmcgcmVwcmVzZW50aW5nIGEgbmFtZSB0byBhc3NvY2lhdGUgd2l0aCB0aGUgdHJhbnNhY3Rpb24uXFxcbiAgICogICBPcHRpb25hbCwgYW5kIGRlZmF1bHRzIHRvIGFuIGVtcHR5IHN0cmluZy5cbiAgICogICBSZXF1aXJlZCB3aGVuIGBpc29sYXRpb25MZXZlbGAgaXMgcHJlc2VudC5cbiAgICovXG4gIHNhdmVUcmFuc2FjdGlvbihjYWxsYmFjazogU2F2ZVRyYW5zYWN0aW9uQ2FsbGJhY2ssIG5hbWU6IHN0cmluZykge1xuICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gbmV3IFRyYW5zYWN0aW9uKG5hbWUpO1xuICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLnRkc1ZlcnNpb24gPCAnN18yJykge1xuICAgICAgcmV0dXJuIHRoaXMuZXhlY1NxbEJhdGNoKG5ldyBSZXF1ZXN0KCdTQVZFIFRSQU4gJyArIHRyYW5zYWN0aW9uLm5hbWUsIChlcnIpID0+IHtcbiAgICAgICAgdGhpcy50cmFuc2FjdGlvbkRlcHRoKys7XG4gICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICB9KSk7XG4gICAgfVxuICAgIGNvbnN0IHJlcXVlc3QgPSBuZXcgUmVxdWVzdCh1bmRlZmluZWQsIGNhbGxiYWNrKTtcbiAgICByZXR1cm4gdGhpcy5tYWtlUmVxdWVzdChyZXF1ZXN0LCBUWVBFLlRSQU5TQUNUSU9OX01BTkFHRVIsIHRyYW5zYWN0aW9uLnNhdmVQYXlsb2FkKHRoaXMuY3VycmVudFRyYW5zYWN0aW9uRGVzY3JpcHRvcigpKSk7XG4gIH1cblxuICAvKipcbiAgICogUnVuIHRoZSBnaXZlbiBjYWxsYmFjayBhZnRlciBzdGFydGluZyBhIHRyYW5zYWN0aW9uLCBhbmQgY29tbWl0IG9yXG4gICAqIHJvbGxiYWNrIHRoZSB0cmFuc2FjdGlvbiBhZnRlcndhcmRzLlxuICAgKlxuICAgKiBUaGlzIGlzIGEgaGVscGVyIHRoYXQgZW1wbG95cyBbW2JlZ2luVHJhbnNhY3Rpb25dXSwgW1tjb21taXRUcmFuc2FjdGlvbl1dLFxuICAgKiBbW3JvbGxiYWNrVHJhbnNhY3Rpb25dXSwgYW5kIFtbc2F2ZVRyYW5zYWN0aW9uXV0gdG8gZ3JlYXRseSBzaW1wbGlmeSB0aGVcbiAgICogdXNlIG9mIGRhdGFiYXNlIHRyYW5zYWN0aW9ucyBhbmQgYXV0b21hdGljYWxseSBoYW5kbGUgdHJhbnNhY3Rpb24gbmVzdGluZy5cbiAgICpcbiAgICogQHBhcmFtIGNiXG4gICAqIEBwYXJhbSBpc29sYXRpb25MZXZlbFxuICAgKiAgIFRoZSBpc29sYXRpb24gbGV2ZWwgdGhhdCB0aGUgdHJhbnNhY3Rpb24gaXMgdG8gYmUgcnVuIHdpdGguXG4gICAqXG4gICAqICAgVGhlIGlzb2xhdGlvbiBsZXZlbHMgYXJlIGF2YWlsYWJsZSBmcm9tIGByZXF1aXJlKCd0ZWRpb3VzJykuSVNPTEFUSU9OX0xFVkVMYC5cbiAgICogICAqIGBSRUFEX1VOQ09NTUlUVEVEYFxuICAgKiAgICogYFJFQURfQ09NTUlUVEVEYFxuICAgKiAgICogYFJFUEVBVEFCTEVfUkVBRGBcbiAgICogICAqIGBTRVJJQUxJWkFCTEVgXG4gICAqICAgKiBgU05BUFNIT1RgXG4gICAqXG4gICAqICAgT3B0aW9uYWwsIGFuZCBkZWZhdWx0cyB0byB0aGUgQ29ubmVjdGlvbidzIGlzb2xhdGlvbiBsZXZlbC5cbiAgICovXG4gIHRyYW5zYWN0aW9uKGNiOiAoZXJyOiBFcnJvciB8IG51bGwgfCB1bmRlZmluZWQsIHR4RG9uZT86IDxUIGV4dGVuZHMgVHJhbnNhY3Rpb25Eb25lQ2FsbGJhY2s+KGVycjogRXJyb3IgfCBudWxsIHwgdW5kZWZpbmVkLCBkb25lOiBULCAuLi5hcmdzOiBDYWxsYmFja1BhcmFtZXRlcnM8VD4pID0+IHZvaWQpID0+IHZvaWQsIGlzb2xhdGlvbkxldmVsPzogdHlwZW9mIElTT0xBVElPTl9MRVZFTFtrZXlvZiB0eXBlb2YgSVNPTEFUSU9OX0xFVkVMXSkge1xuICAgIGlmICh0eXBlb2YgY2IgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2BjYmAgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgY29uc3QgdXNlU2F2ZXBvaW50ID0gdGhpcy5pblRyYW5zYWN0aW9uO1xuICAgIGNvbnN0IG5hbWUgPSAnX3RlZGlvdXNfJyArIChjcnlwdG8ucmFuZG9tQnl0ZXMoMTApLnRvU3RyaW5nKCdoZXgnKSk7XG4gICAgY29uc3QgdHhEb25lOiA8VCBleHRlbmRzIFRyYW5zYWN0aW9uRG9uZUNhbGxiYWNrPihlcnI6IEVycm9yIHwgbnVsbCB8IHVuZGVmaW5lZCwgZG9uZTogVCwgLi4uYXJnczogQ2FsbGJhY2tQYXJhbWV0ZXJzPFQ+KSA9PiB2b2lkID0gKGVyciwgZG9uZSwgLi4uYXJncykgPT4ge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICBpZiAodGhpcy5pblRyYW5zYWN0aW9uICYmIHRoaXMuc3RhdGUgPT09IHRoaXMuU1RBVEUuTE9HR0VEX0lOKSB7XG4gICAgICAgICAgdGhpcy5yb2xsYmFja1RyYW5zYWN0aW9uKCh0eEVycikgPT4ge1xuICAgICAgICAgICAgZG9uZSh0eEVyciB8fCBlcnIsIC4uLmFyZ3MpO1xuICAgICAgICAgIH0sIG5hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRvbmUoZXJyLCAuLi5hcmdzKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh1c2VTYXZlcG9pbnQpIHtcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMudGRzVmVyc2lvbiA8ICc3XzInKSB7XG4gICAgICAgICAgdGhpcy50cmFuc2FjdGlvbkRlcHRoLS07XG4gICAgICAgIH1cbiAgICAgICAgZG9uZShudWxsLCAuLi5hcmdzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuY29tbWl0VHJhbnNhY3Rpb24oKHR4RXJyKSA9PiB7XG4gICAgICAgICAgZG9uZSh0eEVyciwgLi4uYXJncyk7XG4gICAgICAgIH0sIG5hbWUpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAodXNlU2F2ZXBvaW50KSB7XG4gICAgICByZXR1cm4gdGhpcy5zYXZlVHJhbnNhY3Rpb24oKGVycikgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmV0dXJuIGNiKGVycik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXNvbGF0aW9uTGV2ZWwpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5leGVjU3FsQmF0Y2gobmV3IFJlcXVlc3QoJ1NFVCB0cmFuc2FjdGlvbiBpc29sYXRpb24gbGV2ZWwgJyArIHRoaXMuZ2V0SXNvbGF0aW9uTGV2ZWxUZXh0KGlzb2xhdGlvbkxldmVsKSwgKGVycikgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGNiKGVyciwgdHhEb25lKTtcbiAgICAgICAgICB9KSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGNiKG51bGwsIHR4RG9uZSk7XG4gICAgICAgIH1cbiAgICAgIH0sIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5iZWdpblRyYW5zYWN0aW9uKChlcnIpID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHJldHVybiBjYihlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNiKG51bGwsIHR4RG9uZSk7XG4gICAgICB9LCBuYW1lLCBpc29sYXRpb25MZXZlbCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBtYWtlUmVxdWVzdChyZXF1ZXN0OiBSZXF1ZXN0IHwgQnVsa0xvYWQsIHBhY2tldFR5cGU6IG51bWJlciwgcGF5bG9hZDogKEl0ZXJhYmxlPEJ1ZmZlcj4gfCBBc3luY0l0ZXJhYmxlPEJ1ZmZlcj4pICYgeyB0b1N0cmluZzogKGluZGVudD86IHN0cmluZykgPT4gc3RyaW5nIH0pIHtcbiAgICBpZiAodGhpcy5zdGF0ZSAhPT0gdGhpcy5TVEFURS5MT0dHRURfSU4pIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSAnUmVxdWVzdHMgY2FuIG9ubHkgYmUgbWFkZSBpbiB0aGUgJyArIHRoaXMuU1RBVEUuTE9HR0VEX0lOLm5hbWUgKyAnIHN0YXRlLCBub3QgdGhlICcgKyB0aGlzLnN0YXRlLm5hbWUgKyAnIHN0YXRlJztcbiAgICAgIHRoaXMuZGVidWcubG9nKG1lc3NhZ2UpO1xuICAgICAgcmVxdWVzdC5jYWxsYmFjayhuZXcgUmVxdWVzdEVycm9yKG1lc3NhZ2UsICdFSU5WQUxJRFNUQVRFJykpO1xuICAgIH0gZWxzZSBpZiAocmVxdWVzdC5jYW5jZWxlZCkge1xuICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7XG4gICAgICAgIHJlcXVlc3QuY2FsbGJhY2sobmV3IFJlcXVlc3RFcnJvcignQ2FuY2VsZWQuJywgJ0VDQU5DRUwnKSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHBhY2tldFR5cGUgPT09IFRZUEUuU1FMX0JBVENIKSB7XG4gICAgICAgIHRoaXMuaXNTcWxCYXRjaCA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmlzU3FsQmF0Y2ggPSBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5yZXF1ZXN0ID0gcmVxdWVzdDtcbiAgICAgIHJlcXVlc3QuY29ubmVjdGlvbiEgPSB0aGlzO1xuICAgICAgcmVxdWVzdC5yb3dDb3VudCEgPSAwO1xuICAgICAgcmVxdWVzdC5yb3dzISA9IFtdO1xuICAgICAgcmVxdWVzdC5yc3QhID0gW107XG5cbiAgICAgIGNvbnN0IG9uQ2FuY2VsID0gKCkgPT4ge1xuICAgICAgICBwYXlsb2FkU3RyZWFtLnVucGlwZShtZXNzYWdlKTtcbiAgICAgICAgcGF5bG9hZFN0cmVhbS5kZXN0cm95KG5ldyBSZXF1ZXN0RXJyb3IoJ0NhbmNlbGVkLicsICdFQ0FOQ0VMJykpO1xuXG4gICAgICAgIC8vIHNldCB0aGUgaWdub3JlIGJpdCBhbmQgZW5kIHRoZSBtZXNzYWdlLlxuICAgICAgICBtZXNzYWdlLmlnbm9yZSA9IHRydWU7XG4gICAgICAgIG1lc3NhZ2UuZW5kKCk7XG5cbiAgICAgICAgaWYgKHJlcXVlc3QgaW5zdGFuY2VvZiBSZXF1ZXN0ICYmIHJlcXVlc3QucGF1c2VkKSB7XG4gICAgICAgICAgLy8gcmVzdW1lIHRoZSByZXF1ZXN0IGlmIGl0IHdhcyBwYXVzZWQgc28gd2UgY2FuIHJlYWQgdGhlIHJlbWFpbmluZyB0b2tlbnNcbiAgICAgICAgICByZXF1ZXN0LnJlc3VtZSgpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICByZXF1ZXN0Lm9uY2UoJ2NhbmNlbCcsIG9uQ2FuY2VsKTtcblxuICAgICAgdGhpcy5jcmVhdGVSZXF1ZXN0VGltZXIoKTtcblxuICAgICAgY29uc3QgbWVzc2FnZSA9IG5ldyBNZXNzYWdlKHsgdHlwZTogcGFja2V0VHlwZSwgcmVzZXRDb25uZWN0aW9uOiB0aGlzLnJlc2V0Q29ubmVjdGlvbk9uTmV4dFJlcXVlc3QgfSk7XG4gICAgICB0aGlzLm1lc3NhZ2VJby5vdXRnb2luZ01lc3NhZ2VTdHJlYW0ud3JpdGUobWVzc2FnZSk7XG4gICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLlNFTlRfQ0xJRU5UX1JFUVVFU1QpO1xuXG4gICAgICBtZXNzYWdlLm9uY2UoJ2ZpbmlzaCcsICgpID0+IHtcbiAgICAgICAgcmVxdWVzdC5yZW1vdmVMaXN0ZW5lcignY2FuY2VsJywgb25DYW5jZWwpO1xuICAgICAgICByZXF1ZXN0Lm9uY2UoJ2NhbmNlbCcsIHRoaXMuX2NhbmNlbEFmdGVyUmVxdWVzdFNlbnQpO1xuXG4gICAgICAgIHRoaXMucmVzZXRDb25uZWN0aW9uT25OZXh0UmVxdWVzdCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmRlYnVnLnBheWxvYWQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHBheWxvYWQhLnRvU3RyaW5nKCcgICcpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBwYXlsb2FkU3RyZWFtID0gUmVhZGFibGUuZnJvbShwYXlsb2FkKTtcbiAgICAgIHBheWxvYWRTdHJlYW0ub25jZSgnZXJyb3InLCAoZXJyb3IpID0+IHtcbiAgICAgICAgcGF5bG9hZFN0cmVhbS51bnBpcGUobWVzc2FnZSk7XG5cbiAgICAgICAgLy8gT25seSBzZXQgYSByZXF1ZXN0IGVycm9yIGlmIG5vIGVycm9yIHdhcyBzZXQgeWV0LlxuICAgICAgICByZXF1ZXN0LmVycm9yID8/PSBlcnJvcjtcblxuICAgICAgICBtZXNzYWdlLmlnbm9yZSA9IHRydWU7XG4gICAgICAgIG1lc3NhZ2UuZW5kKCk7XG4gICAgICB9KTtcbiAgICAgIHBheWxvYWRTdHJlYW0ucGlwZShtZXNzYWdlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2FuY2VsIGN1cnJlbnRseSBleGVjdXRlZCByZXF1ZXN0LlxuICAgKi9cbiAgY2FuY2VsKCkge1xuICAgIGlmICghdGhpcy5yZXF1ZXN0KSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucmVxdWVzdC5jYW5jZWxlZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRoaXMucmVxdWVzdC5jYW5jZWwoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNldCB0aGUgY29ubmVjdGlvbiB0byBpdHMgaW5pdGlhbCBzdGF0ZS5cbiAgICogQ2FuIGJlIHVzZWZ1bCBmb3IgY29ubmVjdGlvbiBwb29sIGltcGxlbWVudGF0aW9ucy5cbiAgICpcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqL1xuICByZXNldChjYWxsYmFjazogUmVzZXRDYWxsYmFjaykge1xuICAgIGNvbnN0IHJlcXVlc3QgPSBuZXcgUmVxdWVzdCh0aGlzLmdldEluaXRpYWxTcWwoKSwgKGVycikgPT4ge1xuICAgICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMudGRzVmVyc2lvbiA8ICc3XzInKSB7XG4gICAgICAgIHRoaXMuaW5UcmFuc2FjdGlvbiA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICB9KTtcbiAgICB0aGlzLnJlc2V0Q29ubmVjdGlvbk9uTmV4dFJlcXVlc3QgPSB0cnVlO1xuICAgIHRoaXMuZXhlY1NxbEJhdGNoKHJlcXVlc3QpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBjdXJyZW50VHJhbnNhY3Rpb25EZXNjcmlwdG9yKCkge1xuICAgIHJldHVybiB0aGlzLnRyYW5zYWN0aW9uRGVzY3JpcHRvcnNbdGhpcy50cmFuc2FjdGlvbkRlc2NyaXB0b3JzLmxlbmd0aCAtIDFdO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBnZXRJc29sYXRpb25MZXZlbFRleHQoaXNvbGF0aW9uTGV2ZWw6IHR5cGVvZiBJU09MQVRJT05fTEVWRUxba2V5b2YgdHlwZW9mIElTT0xBVElPTl9MRVZFTF0pIHtcbiAgICBzd2l0Y2ggKGlzb2xhdGlvbkxldmVsKSB7XG4gICAgICBjYXNlIElTT0xBVElPTl9MRVZFTC5SRUFEX1VOQ09NTUlUVEVEOlxuICAgICAgICByZXR1cm4gJ3JlYWQgdW5jb21taXR0ZWQnO1xuICAgICAgY2FzZSBJU09MQVRJT05fTEVWRUwuUkVQRUFUQUJMRV9SRUFEOlxuICAgICAgICByZXR1cm4gJ3JlcGVhdGFibGUgcmVhZCc7XG4gICAgICBjYXNlIElTT0xBVElPTl9MRVZFTC5TRVJJQUxJWkFCTEU6XG4gICAgICAgIHJldHVybiAnc2VyaWFsaXphYmxlJztcbiAgICAgIGNhc2UgSVNPTEFUSU9OX0xFVkVMLlNOQVBTSE9UOlxuICAgICAgICByZXR1cm4gJ3NuYXBzaG90JztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiAncmVhZCBjb21taXR0ZWQnO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBpc1RyYW5zaWVudEVycm9yKGVycm9yOiBBZ2dyZWdhdGVFcnJvciB8IENvbm5lY3Rpb25FcnJvcik6IGJvb2xlYW4ge1xuICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBBZ2dyZWdhdGVFcnJvcikge1xuICAgIGVycm9yID0gZXJyb3IuZXJyb3JzWzBdO1xuICB9XG4gIHJldHVybiAoZXJyb3IgaW5zdGFuY2VvZiBDb25uZWN0aW9uRXJyb3IpICYmICEhZXJyb3IuaXNUcmFuc2llbnQ7XG59XG5cbmV4cG9ydCBkZWZhdWx0IENvbm5lY3Rpb247XG5tb2R1bGUuZXhwb3J0cyA9IENvbm5lY3Rpb247XG5cbkNvbm5lY3Rpb24ucHJvdG90eXBlLlNUQVRFID0ge1xuICBJTklUSUFMSVpFRDoge1xuICAgIG5hbWU6ICdJbml0aWFsaXplZCcsXG4gICAgZXZlbnRzOiB7fVxuICB9LFxuICBDT05ORUNUSU5HOiB7XG4gICAgbmFtZTogJ0Nvbm5lY3RpbmcnLFxuICAgIGVudGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuaW5pdGlhbGlzZUNvbm5lY3Rpb24oKTtcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgc29ja2V0RXJyb3I6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgIH0sXG4gICAgICBjb25uZWN0VGltZW91dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgU0VOVF9QUkVMT0dJTjoge1xuICAgIG5hbWU6ICdTZW50UHJlbG9naW4nLFxuICAgIGVudGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIChhc3luYyAoKSA9PiB7XG4gICAgICAgIGxldCBtZXNzYWdlQnVmZmVyID0gQnVmZmVyLmFsbG9jKDApO1xuXG4gICAgICAgIGxldCBtZXNzYWdlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIG1lc3NhZ2UgPSBhd2FpdCB0aGlzLm1lc3NhZ2VJby5yZWFkTWVzc2FnZSgpO1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgIHJldHVybiB0aGlzLnNvY2tldEVycm9yKGVycik7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgYXdhaXQgKGNvbnN0IGRhdGEgb2YgbWVzc2FnZSkge1xuICAgICAgICAgIG1lc3NhZ2VCdWZmZXIgPSBCdWZmZXIuY29uY2F0KFttZXNzYWdlQnVmZmVyLCBkYXRhXSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwcmVsb2dpblBheWxvYWQgPSBuZXcgUHJlbG9naW5QYXlsb2FkKG1lc3NhZ2VCdWZmZXIpO1xuICAgICAgICB0aGlzLmRlYnVnLnBheWxvYWQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHByZWxvZ2luUGF5bG9hZC50b1N0cmluZygnICAnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHByZWxvZ2luUGF5bG9hZC5mZWRBdXRoUmVxdWlyZWQgPT09IDEpIHtcbiAgICAgICAgICB0aGlzLmZlZEF1dGhSZXF1aXJlZCA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocHJlbG9naW5QYXlsb2FkLmVuY3J5cHRpb25TdHJpbmcgPT09ICdPTicgfHwgcHJlbG9naW5QYXlsb2FkLmVuY3J5cHRpb25TdHJpbmcgPT09ICdSRVEnKSB7XG4gICAgICAgICAgaWYgKCF0aGlzLmNvbmZpZy5vcHRpb25zLmVuY3J5cHQpIHtcbiAgICAgICAgICAgIHRoaXMuZW1pdCgnY29ubmVjdCcsIG5ldyBDb25uZWN0aW9uRXJyb3IoXCJTZXJ2ZXIgcmVxdWlyZXMgZW5jcnlwdGlvbiwgc2V0ICdlbmNyeXB0JyBjb25maWcgb3B0aW9uIHRvIHRydWUuXCIsICdFRU5DUllQVCcpKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuU0VOVF9UTFNTU0xORUdPVElBVElPTik7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLm1lc3NhZ2VJby5zdGFydFRscyh0aGlzLnNlY3VyZUNvbnRleHRPcHRpb25zLCB0aGlzLnJvdXRpbmdEYXRhPy5zZXJ2ZXIgPz8gdGhpcy5jb25maWcuc2VydmVyLCB0aGlzLmNvbmZpZy5vcHRpb25zLnRydXN0U2VydmVyQ2VydGlmaWNhdGUpO1xuICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zb2NrZXRFcnJvcihlcnIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2VuZExvZ2luN1BhY2tldCgpO1xuXG4gICAgICAgIGNvbnN0IHsgYXV0aGVudGljYXRpb24gfSA9IHRoaXMuY29uZmlnO1xuXG4gICAgICAgIHN3aXRjaCAoYXV0aGVudGljYXRpb24udHlwZSkge1xuICAgICAgICAgIGNhc2UgJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktcGFzc3dvcmQnOlxuICAgICAgICAgIGNhc2UgJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktbXNpLXZtJzpcbiAgICAgICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS1hcHAtc2VydmljZSc6XG4gICAgICAgICAgY2FzZSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1zZXJ2aWNlLXByaW5jaXBhbC1zZWNyZXQnOlxuICAgICAgICAgIGNhc2UgJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktZGVmYXVsdCc6XG4gICAgICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLlNFTlRfTE9HSU43X1dJVEhfRkVEQVVUSCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdudGxtJzpcbiAgICAgICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuU0VOVF9MT0dJTjdfV0lUSF9OVExNKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLlNFTlRfTE9HSU43X1dJVEhfU1RBTkRBUkRfTE9HSU4pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH0pKCkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHtcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBldmVudHM6IHtcbiAgICAgIHNvY2tldEVycm9yOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICB9LFxuICAgICAgY29ubmVjdFRpbWVvdXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFJFUk9VVElORzoge1xuICAgIG5hbWU6ICdSZVJvdXRpbmcnLFxuICAgIGVudGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuY2xlYW51cENvbm5lY3Rpb24oQ0xFQU5VUF9UWVBFLlJFRElSRUNUKTtcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgbWVzc2FnZTogZnVuY3Rpb24oKSB7XG4gICAgICB9LFxuICAgICAgc29ja2V0RXJyb3I6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgIH0sXG4gICAgICBjb25uZWN0VGltZW91dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgICAgfSxcbiAgICAgIHJlY29ubmVjdDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuQ09OTkVDVElORyk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBUUkFOU0lFTlRfRkFJTFVSRV9SRVRSWToge1xuICAgIG5hbWU6ICdUUkFOU0lFTlRfRkFJTFVSRV9SRVRSWScsXG4gICAgZW50ZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5jdXJUcmFuc2llbnRSZXRyeUNvdW50Kys7XG4gICAgICB0aGlzLmNsZWFudXBDb25uZWN0aW9uKENMRUFOVVBfVFlQRS5SRVRSWSk7XG4gICAgfSxcbiAgICBldmVudHM6IHtcbiAgICAgIG1lc3NhZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgfSxcbiAgICAgIHNvY2tldEVycm9yOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICB9LFxuICAgICAgY29ubmVjdFRpbWVvdXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgIH0sXG4gICAgICByZXRyeTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuY3JlYXRlUmV0cnlUaW1lcigpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgU0VOVF9UTFNTU0xORUdPVElBVElPTjoge1xuICAgIG5hbWU6ICdTZW50VExTU1NMTmVnb3RpYXRpb24nLFxuICAgIGV2ZW50czoge1xuICAgICAgc29ja2V0RXJyb3I6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgIH0sXG4gICAgICBjb25uZWN0VGltZW91dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgU0VOVF9MT0dJTjdfV0lUSF9TVEFOREFSRF9MT0dJTjoge1xuICAgIG5hbWU6ICdTZW50TG9naW43V2l0aFN0YW5kYXJkTG9naW4nLFxuICAgIGVudGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIChhc3luYyAoKSA9PiB7XG4gICAgICAgIGxldCBtZXNzYWdlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIG1lc3NhZ2UgPSBhd2FpdCB0aGlzLm1lc3NhZ2VJby5yZWFkTWVzc2FnZSgpO1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgIHJldHVybiB0aGlzLnNvY2tldEVycm9yKGVycik7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBoYW5kbGVyID0gbmV3IExvZ2luN1Rva2VuSGFuZGxlcih0aGlzKTtcbiAgICAgICAgY29uc3QgdG9rZW5TdHJlYW1QYXJzZXIgPSB0aGlzLmNyZWF0ZVRva2VuU3RyZWFtUGFyc2VyKG1lc3NhZ2UsIGhhbmRsZXIpO1xuXG4gICAgICAgIGF3YWl0IG9uY2UodG9rZW5TdHJlYW1QYXJzZXIsICdlbmQnKTtcblxuICAgICAgICBpZiAoaGFuZGxlci5sb2dpbkFja1JlY2VpdmVkKSB7XG4gICAgICAgICAgaWYgKGhhbmRsZXIucm91dGluZ0RhdGEpIHtcbiAgICAgICAgICAgIHRoaXMucm91dGluZ0RhdGEgPSBoYW5kbGVyLnJvdXRpbmdEYXRhO1xuICAgICAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5SRVJPVVRJTkcpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkxPR0dFRF9JTl9TRU5ESU5HX0lOSVRJQUxfU1FMKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5sb2dpbkVycm9yKSB7XG4gICAgICAgICAgaWYgKGlzVHJhbnNpZW50RXJyb3IodGhpcy5sb2dpbkVycm9yKSkge1xuICAgICAgICAgICAgdGhpcy5kZWJ1Zy5sb2coJ0luaXRpYXRpbmcgcmV0cnkgb24gdHJhbnNpZW50IGVycm9yJyk7XG4gICAgICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLlRSQU5TSUVOVF9GQUlMVVJFX1JFVFJZKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5lbWl0KCdjb25uZWN0JywgdGhpcy5sb2dpbkVycm9yKTtcbiAgICAgICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLmVtaXQoJ2Nvbm5lY3QnLCBuZXcgQ29ubmVjdGlvbkVycm9yKCdMb2dpbiBmYWlsZWQuJywgJ0VMT0dJTicpKTtcbiAgICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgICAgfVxuICAgICAgfSkoKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgc29ja2V0RXJyb3I6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgIH0sXG4gICAgICBjb25uZWN0VGltZW91dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgU0VOVF9MT0dJTjdfV0lUSF9OVExNOiB7XG4gICAgbmFtZTogJ1NlbnRMb2dpbjdXaXRoTlRMTUxvZ2luJyxcbiAgICBlbnRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAoYXN5bmMgKCkgPT4ge1xuICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgIGxldCBtZXNzYWdlO1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBtZXNzYWdlID0gYXdhaXQgdGhpcy5tZXNzYWdlSW8ucmVhZE1lc3NhZ2UoKTtcbiAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc29ja2V0RXJyb3IoZXJyKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBoYW5kbGVyID0gbmV3IExvZ2luN1Rva2VuSGFuZGxlcih0aGlzKTtcbiAgICAgICAgICBjb25zdCB0b2tlblN0cmVhbVBhcnNlciA9IHRoaXMuY3JlYXRlVG9rZW5TdHJlYW1QYXJzZXIobWVzc2FnZSwgaGFuZGxlcik7XG5cbiAgICAgICAgICBhd2FpdCBvbmNlKHRva2VuU3RyZWFtUGFyc2VyLCAnZW5kJyk7XG5cbiAgICAgICAgICBpZiAoaGFuZGxlci5sb2dpbkFja1JlY2VpdmVkKSB7XG4gICAgICAgICAgICBpZiAoaGFuZGxlci5yb3V0aW5nRGF0YSkge1xuICAgICAgICAgICAgICB0aGlzLnJvdXRpbmdEYXRhID0gaGFuZGxlci5yb3V0aW5nRGF0YTtcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuUkVST1VUSU5HKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkxPR0dFRF9JTl9TRU5ESU5HX0lOSVRJQUxfU1FMKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMubnRsbXBhY2tldCkge1xuICAgICAgICAgICAgY29uc3QgYXV0aGVudGljYXRpb24gPSB0aGlzLmNvbmZpZy5hdXRoZW50aWNhdGlvbiBhcyBOdGxtQXV0aGVudGljYXRpb247XG5cbiAgICAgICAgICAgIGNvbnN0IHBheWxvYWQgPSBuZXcgTlRMTVJlc3BvbnNlUGF5bG9hZCh7XG4gICAgICAgICAgICAgIGRvbWFpbjogYXV0aGVudGljYXRpb24ub3B0aW9ucy5kb21haW4sXG4gICAgICAgICAgICAgIHVzZXJOYW1lOiBhdXRoZW50aWNhdGlvbi5vcHRpb25zLnVzZXJOYW1lLFxuICAgICAgICAgICAgICBwYXNzd29yZDogYXV0aGVudGljYXRpb24ub3B0aW9ucy5wYXNzd29yZCxcbiAgICAgICAgICAgICAgbnRsbXBhY2tldDogdGhpcy5udGxtcGFja2V0XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy5tZXNzYWdlSW8uc2VuZE1lc3NhZ2UoVFlQRS5OVExNQVVUSF9QS1QsIHBheWxvYWQuZGF0YSk7XG4gICAgICAgICAgICB0aGlzLmRlYnVnLnBheWxvYWQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHJldHVybiBwYXlsb2FkLnRvU3RyaW5nKCcgICcpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRoaXMubnRsbXBhY2tldCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMubG9naW5FcnJvcikge1xuICAgICAgICAgICAgaWYgKGlzVHJhbnNpZW50RXJyb3IodGhpcy5sb2dpbkVycm9yKSkge1xuICAgICAgICAgICAgICB0aGlzLmRlYnVnLmxvZygnSW5pdGlhdGluZyByZXRyeSBvbiB0cmFuc2llbnQgZXJyb3InKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuVFJBTlNJRU5UX0ZBSUxVUkVfUkVUUlkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhpcy5lbWl0KCdjb25uZWN0JywgdGhpcy5sb2dpbkVycm9yKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmVtaXQoJ2Nvbm5lY3QnLCBuZXcgQ29ubmVjdGlvbkVycm9yKCdMb2dpbiBmYWlsZWQuJywgJ0VMT0dJTicpKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgfSkoKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgc29ja2V0RXJyb3I6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgIH0sXG4gICAgICBjb25uZWN0VGltZW91dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgU0VOVF9MT0dJTjdfV0lUSF9GRURBVVRIOiB7XG4gICAgbmFtZTogJ1NlbnRMb2dpbjdXaXRoZmVkYXV0aCcsXG4gICAgZW50ZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgKGFzeW5jICgpID0+IHtcbiAgICAgICAgbGV0IG1lc3NhZ2U7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbWVzc2FnZSA9IGF3YWl0IHRoaXMubWVzc2FnZUlvLnJlYWRNZXNzYWdlKCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuc29ja2V0RXJyb3IoZXJyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSBuZXcgTG9naW43VG9rZW5IYW5kbGVyKHRoaXMpO1xuICAgICAgICBjb25zdCB0b2tlblN0cmVhbVBhcnNlciA9IHRoaXMuY3JlYXRlVG9rZW5TdHJlYW1QYXJzZXIobWVzc2FnZSwgaGFuZGxlcik7XG4gICAgICAgIGF3YWl0IG9uY2UodG9rZW5TdHJlYW1QYXJzZXIsICdlbmQnKTtcbiAgICAgICAgaWYgKGhhbmRsZXIubG9naW5BY2tSZWNlaXZlZCkge1xuICAgICAgICAgIGlmIChoYW5kbGVyLnJvdXRpbmdEYXRhKSB7XG4gICAgICAgICAgICB0aGlzLnJvdXRpbmdEYXRhID0gaGFuZGxlci5yb3V0aW5nRGF0YTtcbiAgICAgICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuUkVST1VUSU5HKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5MT0dHRURfSU5fU0VORElOR19JTklUSUFMX1NRTCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZmVkQXV0aEluZm9Ub2tlbiA9IGhhbmRsZXIuZmVkQXV0aEluZm9Ub2tlbjtcblxuICAgICAgICBpZiAoZmVkQXV0aEluZm9Ub2tlbiAmJiBmZWRBdXRoSW5mb1Rva2VuLnN0c3VybCAmJiBmZWRBdXRoSW5mb1Rva2VuLnNwbikge1xuICAgICAgICAgIGNvbnN0IGF1dGhlbnRpY2F0aW9uID0gdGhpcy5jb25maWcuYXV0aGVudGljYXRpb24gYXMgQXp1cmVBY3RpdmVEaXJlY3RvcnlQYXNzd29yZEF1dGhlbnRpY2F0aW9uIHwgQXp1cmVBY3RpdmVEaXJlY3RvcnlNc2lWbUF1dGhlbnRpY2F0aW9uIHwgQXp1cmVBY3RpdmVEaXJlY3RvcnlNc2lBcHBTZXJ2aWNlQXV0aGVudGljYXRpb24gfCBBenVyZUFjdGl2ZURpcmVjdG9yeVNlcnZpY2VQcmluY2lwYWxTZWNyZXQgfCBBenVyZUFjdGl2ZURpcmVjdG9yeURlZmF1bHRBdXRoZW50aWNhdGlvbjtcbiAgICAgICAgICBjb25zdCB0b2tlblNjb3BlID0gbmV3IFVSTCgnLy5kZWZhdWx0JywgZmVkQXV0aEluZm9Ub2tlbi5zcG4pLnRvU3RyaW5nKCk7XG5cbiAgICAgICAgICBsZXQgY3JlZGVudGlhbHM7XG5cbiAgICAgICAgICBzd2l0Y2ggKGF1dGhlbnRpY2F0aW9uLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktcGFzc3dvcmQnOlxuICAgICAgICAgICAgICBjcmVkZW50aWFscyA9IG5ldyBVc2VybmFtZVBhc3N3b3JkQ3JlZGVudGlhbChcbiAgICAgICAgICAgICAgICBhdXRoZW50aWNhdGlvbi5vcHRpb25zLnRlbmFudElkID8/ICdjb21tb24nLFxuICAgICAgICAgICAgICAgIGF1dGhlbnRpY2F0aW9uLm9wdGlvbnMuY2xpZW50SWQsXG4gICAgICAgICAgICAgICAgYXV0aGVudGljYXRpb24ub3B0aW9ucy51c2VyTmFtZSxcbiAgICAgICAgICAgICAgICBhdXRoZW50aWNhdGlvbi5vcHRpb25zLnBhc3N3b3JkXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktdm0nOlxuICAgICAgICAgICAgY2FzZSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktYXBwLXNlcnZpY2UnOlxuICAgICAgICAgICAgICBjb25zdCBtc2lBcmdzID0gYXV0aGVudGljYXRpb24ub3B0aW9ucy5jbGllbnRJZCA/IFthdXRoZW50aWNhdGlvbi5vcHRpb25zLmNsaWVudElkLCB7fV0gOiBbe31dO1xuICAgICAgICAgICAgICBjcmVkZW50aWFscyA9IG5ldyBNYW5hZ2VkSWRlbnRpdHlDcmVkZW50aWFsKC4uLm1zaUFyZ3MpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktZGVmYXVsdCc6XG4gICAgICAgICAgICAgIGNvbnN0IGFyZ3MgPSBhdXRoZW50aWNhdGlvbi5vcHRpb25zLmNsaWVudElkID8geyBtYW5hZ2VkSWRlbnRpdHlDbGllbnRJZDogYXV0aGVudGljYXRpb24ub3B0aW9ucy5jbGllbnRJZCB9IDoge307XG4gICAgICAgICAgICAgIGNyZWRlbnRpYWxzID0gbmV3IERlZmF1bHRBenVyZUNyZWRlbnRpYWwoYXJncyk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1zZXJ2aWNlLXByaW5jaXBhbC1zZWNyZXQnOlxuICAgICAgICAgICAgICBjcmVkZW50aWFscyA9IG5ldyBDbGllbnRTZWNyZXRDcmVkZW50aWFsKFxuICAgICAgICAgICAgICAgIGF1dGhlbnRpY2F0aW9uLm9wdGlvbnMudGVuYW50SWQsXG4gICAgICAgICAgICAgICAgYXV0aGVudGljYXRpb24ub3B0aW9ucy5jbGllbnRJZCxcbiAgICAgICAgICAgICAgICBhdXRoZW50aWNhdGlvbi5vcHRpb25zLmNsaWVudFNlY3JldFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsZXQgdG9rZW5SZXNwb25zZTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgdG9rZW5SZXNwb25zZSA9IGF3YWl0IGNyZWRlbnRpYWxzLmdldFRva2VuKHRva2VuU2NvcGUpO1xuICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgdGhpcy5sb2dpbkVycm9yID0gbmV3IEFnZ3JlZ2F0ZUVycm9yKFxuICAgICAgICAgICAgICBbbmV3IENvbm5lY3Rpb25FcnJvcignU2VjdXJpdHkgdG9rZW4gY291bGQgbm90IGJlIGF1dGhlbnRpY2F0ZWQgb3IgYXV0aG9yaXplZC4nLCAnRUZFREFVVEgnKSwgZXJyXSk7XG4gICAgICAgICAgICB0aGlzLmVtaXQoJ2Nvbm5lY3QnLCB0aGlzLmxvZ2luRXJyb3IpO1xuICAgICAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG5cbiAgICAgICAgICBjb25zdCB0b2tlbiA9IHRva2VuUmVzcG9uc2UudG9rZW47XG4gICAgICAgICAgdGhpcy5zZW5kRmVkQXV0aFRva2VuTWVzc2FnZSh0b2tlbik7XG5cbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmxvZ2luRXJyb3IpIHtcbiAgICAgICAgICBpZiAoaXNUcmFuc2llbnRFcnJvcih0aGlzLmxvZ2luRXJyb3IpKSB7XG4gICAgICAgICAgICB0aGlzLmRlYnVnLmxvZygnSW5pdGlhdGluZyByZXRyeSBvbiB0cmFuc2llbnQgZXJyb3InKTtcbiAgICAgICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuVFJBTlNJRU5UX0ZBSUxVUkVfUkVUUlkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmVtaXQoJ2Nvbm5lY3QnLCB0aGlzLmxvZ2luRXJyb3IpO1xuICAgICAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuZW1pdCgnY29ubmVjdCcsIG5ldyBDb25uZWN0aW9uRXJyb3IoJ0xvZ2luIGZhaWxlZC4nLCAnRUxPR0lOJykpO1xuICAgICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgICAgICB9XG5cbiAgICAgIH0pKCkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHtcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBldmVudHM6IHtcbiAgICAgIHNvY2tldEVycm9yOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICB9LFxuICAgICAgY29ubmVjdFRpbWVvdXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIExPR0dFRF9JTl9TRU5ESU5HX0lOSVRJQUxfU1FMOiB7XG4gICAgbmFtZTogJ0xvZ2dlZEluU2VuZGluZ0luaXRpYWxTcWwnLFxuICAgIGVudGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIChhc3luYyAoKSA9PiB7XG4gICAgICAgIHRoaXMuc2VuZEluaXRpYWxTcWwoKTtcbiAgICAgICAgbGV0IG1lc3NhZ2U7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbWVzc2FnZSA9IGF3YWl0IHRoaXMubWVzc2FnZUlvLnJlYWRNZXNzYWdlKCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuc29ja2V0RXJyb3IoZXJyKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB0b2tlblN0cmVhbVBhcnNlciA9IHRoaXMuY3JlYXRlVG9rZW5TdHJlYW1QYXJzZXIobWVzc2FnZSwgbmV3IEluaXRpYWxTcWxUb2tlbkhhbmRsZXIodGhpcykpO1xuICAgICAgICBhd2FpdCBvbmNlKHRva2VuU3RyZWFtUGFyc2VyLCAnZW5kJyk7XG5cbiAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5MT0dHRURfSU4pO1xuICAgICAgICB0aGlzLnByb2Nlc3NlZEluaXRpYWxTcWwoKTtcblxuICAgICAgfSkoKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgc29ja2V0RXJyb3I6IGZ1bmN0aW9uIHNvY2tldEVycm9yKCkge1xuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgIH0sXG4gICAgICBjb25uZWN0VGltZW91dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgTE9HR0VEX0lOOiB7XG4gICAgbmFtZTogJ0xvZ2dlZEluJyxcbiAgICBldmVudHM6IHtcbiAgICAgIHNvY2tldEVycm9yOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBTRU5UX0NMSUVOVF9SRVFVRVNUOiB7XG4gICAgbmFtZTogJ1NlbnRDbGllbnRSZXF1ZXN0JyxcbiAgICBlbnRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAoYXN5bmMgKCkgPT4ge1xuICAgICAgICBsZXQgbWVzc2FnZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBtZXNzYWdlID0gYXdhaXQgdGhpcy5tZXNzYWdlSW8ucmVhZE1lc3NhZ2UoKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5zb2NrZXRFcnJvcihlcnIpO1xuICAgICAgICB9XG4gICAgICAgIC8vIHJlcXVlc3QgdGltZXIgaXMgc3RvcHBlZCBvbiBmaXJzdCBkYXRhIHBhY2thZ2VcbiAgICAgICAgdGhpcy5jbGVhclJlcXVlc3RUaW1lcigpO1xuXG4gICAgICAgIGNvbnN0IHRva2VuU3RyZWFtUGFyc2VyID0gdGhpcy5jcmVhdGVUb2tlblN0cmVhbVBhcnNlcihtZXNzYWdlLCBuZXcgUmVxdWVzdFRva2VuSGFuZGxlcih0aGlzLCB0aGlzLnJlcXVlc3QhKSk7XG5cbiAgICAgICAgLy8gSWYgdGhlIHJlcXVlc3Qgd2FzIGNhbmNlbGVkIGFuZCB3ZSBoYXZlIGEgYGNhbmNlbFRpbWVyYFxuICAgICAgICAvLyBkZWZpbmVkLCB3ZSBzZW5kIGEgYXR0ZW50aW9uIG1lc3NhZ2UgYWZ0ZXIgdGhlXG4gICAgICAgIC8vIHJlcXVlc3QgbWVzc2FnZSB3YXMgZnVsbHkgc2VudCBvZmYuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFdlIGFscmVhZHkgc3RhcnRlZCBjb25zdW1pbmcgdGhlIGN1cnJlbnQgbWVzc2FnZVxuICAgICAgICAvLyAoYnV0IGFsbCB0aGUgdG9rZW4gaGFuZGxlcnMgc2hvdWxkIGJlIG5vLW9wcyksIGFuZFxuICAgICAgICAvLyBuZWVkIHRvIGVuc3VyZSB0aGUgbmV4dCBtZXNzYWdlIGlzIGhhbmRsZWQgYnkgdGhlXG4gICAgICAgIC8vIGBTRU5UX0FUVEVOVElPTmAgc3RhdGUuXG4gICAgICAgIGlmICh0aGlzLnJlcXVlc3Q/LmNhbmNlbGVkICYmIHRoaXMuY2FuY2VsVGltZXIpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5TRU5UX0FUVEVOVElPTik7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvblJlc3VtZSA9ICgpID0+IHtcbiAgICAgICAgICB0b2tlblN0cmVhbVBhcnNlci5yZXN1bWUoKTtcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3Qgb25QYXVzZSA9ICgpID0+IHtcbiAgICAgICAgICB0b2tlblN0cmVhbVBhcnNlci5wYXVzZSgpO1xuXG4gICAgICAgICAgdGhpcy5yZXF1ZXN0Py5vbmNlKCdyZXN1bWUnLCBvblJlc3VtZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5yZXF1ZXN0Py5vbigncGF1c2UnLCBvblBhdXNlKTtcblxuICAgICAgICBpZiAodGhpcy5yZXF1ZXN0IGluc3RhbmNlb2YgUmVxdWVzdCAmJiB0aGlzLnJlcXVlc3QucGF1c2VkKSB7XG4gICAgICAgICAgb25QYXVzZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb25DYW5jZWwgPSAoKSA9PiB7XG4gICAgICAgICAgdG9rZW5TdHJlYW1QYXJzZXIucmVtb3ZlTGlzdGVuZXIoJ2VuZCcsIG9uRW5kT2ZNZXNzYWdlKTtcblxuICAgICAgICAgIGlmICh0aGlzLnJlcXVlc3QgaW5zdGFuY2VvZiBSZXF1ZXN0ICYmIHRoaXMucmVxdWVzdC5wYXVzZWQpIHtcbiAgICAgICAgICAgIC8vIHJlc3VtZSB0aGUgcmVxdWVzdCBpZiBpdCB3YXMgcGF1c2VkIHNvIHdlIGNhbiByZWFkIHRoZSByZW1haW5pbmcgdG9rZW5zXG4gICAgICAgICAgICB0aGlzLnJlcXVlc3QucmVzdW1lKCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdGhpcy5yZXF1ZXN0Py5yZW1vdmVMaXN0ZW5lcigncGF1c2UnLCBvblBhdXNlKTtcbiAgICAgICAgICB0aGlzLnJlcXVlc3Q/LnJlbW92ZUxpc3RlbmVyKCdyZXN1bWUnLCBvblJlc3VtZSk7XG5cbiAgICAgICAgICAvLyBUaGUgYF9jYW5jZWxBZnRlclJlcXVlc3RTZW50YCBjYWxsYmFjayB3aWxsIGhhdmUgc2VudCBhXG4gICAgICAgICAgLy8gYXR0ZW50aW9uIG1lc3NhZ2UsIHNvIG5vdyB3ZSBuZWVkIHRvIGFsc28gc3dpdGNoIHRvXG4gICAgICAgICAgLy8gdGhlIGBTRU5UX0FUVEVOVElPTmAgc3RhdGUgdG8gbWFrZSBzdXJlIHRoZSBhdHRlbnRpb24gYWNrXG4gICAgICAgICAgLy8gbWVzc2FnZSBpcyBwcm9jZXNzZWQgY29ycmVjdGx5LlxuICAgICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuU0VOVF9BVFRFTlRJT04pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IG9uRW5kT2ZNZXNzYWdlID0gKCkgPT4ge1xuICAgICAgICAgIHRoaXMucmVxdWVzdD8ucmVtb3ZlTGlzdGVuZXIoJ2NhbmNlbCcsIHRoaXMuX2NhbmNlbEFmdGVyUmVxdWVzdFNlbnQpO1xuICAgICAgICAgIHRoaXMucmVxdWVzdD8ucmVtb3ZlTGlzdGVuZXIoJ2NhbmNlbCcsIG9uQ2FuY2VsKTtcbiAgICAgICAgICB0aGlzLnJlcXVlc3Q/LnJlbW92ZUxpc3RlbmVyKCdwYXVzZScsIG9uUGF1c2UpO1xuICAgICAgICAgIHRoaXMucmVxdWVzdD8ucmVtb3ZlTGlzdGVuZXIoJ3Jlc3VtZScsIG9uUmVzdW1lKTtcblxuICAgICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuTE9HR0VEX0lOKTtcbiAgICAgICAgICBjb25zdCBzcWxSZXF1ZXN0ID0gdGhpcy5yZXF1ZXN0IGFzIFJlcXVlc3Q7XG4gICAgICAgICAgdGhpcy5yZXF1ZXN0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLnRkc1ZlcnNpb24gPCAnN18yJyAmJiBzcWxSZXF1ZXN0LmVycm9yICYmIHRoaXMuaXNTcWxCYXRjaCkge1xuICAgICAgICAgICAgdGhpcy5pblRyYW5zYWN0aW9uID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIHNxbFJlcXVlc3QuY2FsbGJhY2soc3FsUmVxdWVzdC5lcnJvciwgc3FsUmVxdWVzdC5yb3dDb3VudCwgc3FsUmVxdWVzdC5yb3dzKTtcbiAgICAgICAgfTtcblxuICAgICAgICB0b2tlblN0cmVhbVBhcnNlci5vbmNlKCdlbmQnLCBvbkVuZE9mTWVzc2FnZSk7XG4gICAgICAgIHRoaXMucmVxdWVzdD8ub25jZSgnY2FuY2VsJywgb25DYW5jZWwpO1xuICAgICAgfSkoKTtcblxuICAgIH0sXG4gICAgZXhpdDogZnVuY3Rpb24obmV4dFN0YXRlKSB7XG4gICAgICB0aGlzLmNsZWFyUmVxdWVzdFRpbWVyKCk7XG4gICAgfSxcbiAgICBldmVudHM6IHtcbiAgICAgIHNvY2tldEVycm9yOiBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgY29uc3Qgc3FsUmVxdWVzdCA9IHRoaXMucmVxdWVzdCE7XG4gICAgICAgIHRoaXMucmVxdWVzdCA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG5cbiAgICAgICAgc3FsUmVxdWVzdC5jYWxsYmFjayhlcnIpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgU0VOVF9BVFRFTlRJT046IHtcbiAgICBuYW1lOiAnU2VudEF0dGVudGlvbicsXG4gICAgZW50ZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgKGFzeW5jICgpID0+IHtcbiAgICAgICAgbGV0IG1lc3NhZ2U7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbWVzc2FnZSA9IGF3YWl0IHRoaXMubWVzc2FnZUlvLnJlYWRNZXNzYWdlKCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuc29ja2V0RXJyb3IoZXJyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSBuZXcgQXR0ZW50aW9uVG9rZW5IYW5kbGVyKHRoaXMsIHRoaXMucmVxdWVzdCEpO1xuICAgICAgICBjb25zdCB0b2tlblN0cmVhbVBhcnNlciA9IHRoaXMuY3JlYXRlVG9rZW5TdHJlYW1QYXJzZXIobWVzc2FnZSwgaGFuZGxlcik7XG5cbiAgICAgICAgYXdhaXQgb25jZSh0b2tlblN0cmVhbVBhcnNlciwgJ2VuZCcpO1xuICAgICAgICAvLyAzLjIuNS43IFNlbnQgQXR0ZW50aW9uIFN0YXRlXG4gICAgICAgIC8vIERpc2NhcmQgYW55IGRhdGEgY29udGFpbmVkIGluIHRoZSByZXNwb25zZSwgdW50aWwgd2UgcmVjZWl2ZSB0aGUgYXR0ZW50aW9uIHJlc3BvbnNlXG4gICAgICAgIGlmIChoYW5kbGVyLmF0dGVudGlvblJlY2VpdmVkKSB7XG4gICAgICAgICAgdGhpcy5jbGVhckNhbmNlbFRpbWVyKCk7XG5cbiAgICAgICAgICBjb25zdCBzcWxSZXF1ZXN0ID0gdGhpcy5yZXF1ZXN0ITtcbiAgICAgICAgICB0aGlzLnJlcXVlc3QgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5MT0dHRURfSU4pO1xuXG4gICAgICAgICAgaWYgKHNxbFJlcXVlc3QuZXJyb3IgJiYgc3FsUmVxdWVzdC5lcnJvciBpbnN0YW5jZW9mIFJlcXVlc3RFcnJvciAmJiBzcWxSZXF1ZXN0LmVycm9yLmNvZGUgPT09ICdFVElNRU9VVCcpIHtcbiAgICAgICAgICAgIHNxbFJlcXVlc3QuY2FsbGJhY2soc3FsUmVxdWVzdC5lcnJvcik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNxbFJlcXVlc3QuY2FsbGJhY2sobmV3IFJlcXVlc3RFcnJvcignQ2FuY2VsZWQuJywgJ0VDQU5DRUwnKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgIH0pKCkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHtcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBldmVudHM6IHtcbiAgICAgIHNvY2tldEVycm9yOiBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgY29uc3Qgc3FsUmVxdWVzdCA9IHRoaXMucmVxdWVzdCE7XG4gICAgICAgIHRoaXMucmVxdWVzdCA9IHVuZGVmaW5lZDtcblxuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcblxuICAgICAgICBzcWxSZXF1ZXN0LmNhbGxiYWNrKGVycik7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBGSU5BTDoge1xuICAgIG5hbWU6ICdGaW5hbCcsXG4gICAgZW50ZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5jbGVhbnVwQ29ubmVjdGlvbihDTEVBTlVQX1RZUEUuTk9STUFMKTtcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgY29ubmVjdFRpbWVvdXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBEbyBub3RoaW5nLCBhcyB0aGUgdGltZXIgc2hvdWxkIGJlIGNsZWFuZWQgdXAuXG4gICAgICB9LFxuICAgICAgbWVzc2FnZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIERvIG5vdGhpbmdcbiAgICAgIH0sXG4gICAgICBzb2NrZXRFcnJvcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIERvIG5vdGhpbmdcbiAg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