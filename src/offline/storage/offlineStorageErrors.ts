export class OfflineStorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class OfflineStorageUnavailableError extends OfflineStorageError {}
export class OfflineContextInvalidError extends OfflineStorageError {}
export class OfflineRecordNotFoundError extends OfflineStorageError {}
export class OfflineAccessDeniedError extends OfflineStorageError {}
export class OfflineMigrationError extends OfflineStorageError {}
export class OfflineTransactionError extends OfflineStorageError {}
