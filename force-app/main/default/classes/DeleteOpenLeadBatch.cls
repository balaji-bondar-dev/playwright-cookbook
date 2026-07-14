/**
 * Batch Apex class for deleting Lead records with Open status.
 * Processes Lead records in configurable batch sizes.
 * Implements Database.Stateful to track cumulative results across chunks.
 *
 * @example
 * // Execute with default batch size
 * Database.executeBatch(new DeleteOpenLeadBatch());
 *
 * // Execute with custom batch size
 * Database.executeBatch(new DeleteOpenLeadBatch(), 100);
 *
 * // Convenience method
 * Id jobId = DeleteOpenLeadBatch.run();
 */
public with sharing class DeleteOpenLeadBatch implements Database.Batchable<SObject>, Database.Stateful {

    // ─── Constants ───────────────────────────────────────────────────────
    private static final Integer DEFAULT_BATCH_SIZE = 200;
    private static final String OPEN_STATUS_PREFIX = 'Open';

    // ─── Stateful Tracking ───────────────────────────────────────────────
    private Integer totalDeleted = 0;
    private Integer totalErrors = 0;
    private List<String> errorMessages = new List<String>();

    // ─── Constructor ─────────────────────────────────────────────────────

    /**
     * Default constructor
     */
    public DeleteOpenLeadBatch() {
    }

    // ─── Batchable Interface ─────────────────────────────────────────────

    /**
     * Defines the scope of records to process.
     * Uses Database.QueryLocator for efficient large-dataset processing.
     * Queries all leads with status starting with 'Open'.
     * @param bc The batch context
     * @return QueryLocator for the Lead records to delete
     */
    public Database.QueryLocator start(Database.BatchableContext bc) {
        return Database.getQueryLocator([
            SELECT Id, Name, Status
            FROM Lead
            WHERE Status LIKE :OPEN_STATUS_PREFIX + '%'
            WITH USER_MODE
        ]);
    }

    /**
     * Processes each batch of Lead records.
     * Uses Database.delete with allOrNone=false for partial success handling.
     * @param bc The batch context
     * @param scope List of Lead records in the current batch
     */
    public void execute(Database.BatchableContext bc, List<Lead> scope) {
        if (scope == null || scope.isEmpty()) {
            return;
        }

        List<Database.DeleteResult> results = Database.delete(scope, false, AccessLevel.USER_MODE);
        processResults(results);
    }

    /**
     * Performs post-processing after all batches complete.
     * Logs a summary of the batch execution.
     * @param bc The batch context
     */
    public void finish(Database.BatchableContext bc) {
        String summary = String.format(
            '{0} completed. Deleted: {1}, Errors: {2}',
            new List<Object>{
                DeleteOpenLeadBatch.class.getName(),
                totalDeleted,
                totalErrors
            }
        );

        System.debug(LoggingLevel.INFO, summary);

        if (!errorMessages.isEmpty()) {
            System.debug(LoggingLevel.ERROR, 'Error details: ' + String.join(errorMessages, '\n'));
        }
    }

    // ─── Private Helpers ─────────────────────────────────────────────────

    /**
     * Processes Database.DeleteResult list, tracking successes and failures
     * @param results List of DeleteResult from a DML operation
     */
    private void processResults(List<Database.DeleteResult> results) {
        for (Database.DeleteResult result : results) {
            if (result.isSuccess()) {
                totalDeleted++;
            } else {
                totalErrors++;
                for (Database.Error err : result.getErrors()) {
                    errorMessages.add(
                        'Record ' + result.getId() + ': ' +
                        err.getStatusCode() + ' - ' + err.getMessage()
                    );
                }
            }
        }
    }

    // ─── Static Helpers ──────────────────────────────────────────────────

    /**
     * Convenience method to execute with default batch size
     * @return The batch job Id
     * @example
     * Id jobId = DeleteOpenLeadBatch.run();
     */
    public static Id run() {
        return Database.executeBatch(new DeleteOpenLeadBatch(), DEFAULT_BATCH_SIZE);
    }
}