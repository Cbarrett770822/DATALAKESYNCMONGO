# TaskDetail Sync UI Flow

## User Interface Flow for TaskDetail Synchronization

This document describes the user interface flow and experience when synchronizing TaskDetail data.

### Initial State

When the user first navigates to the TaskDetail sync page:

1. The UI loads the current sync configuration from the backend
2. The UI displays:
   - Sync configuration details (warehouse ID, batch size, etc.)
   - Last sync status and date
   - A "Play" button to start the sync
   - Recent sync history (last 5 sync operations)

### Starting the Sync

When the user clicks the "Play" button:

1. The button changes to a spinner to indicate activity
2. The UI sends the sync request to the backend
3. A progress indicator appears showing "Starting sync..."
4. The UI begins polling for status updates

### During Sync

While the sync is in progress:

1. The UI displays a progress bar showing:
   - Percentage complete (processed records / total records)
   - Current status message
   - Number of records processed so far
   - Number of records inserted/updated
   - Any errors encountered

2. The UI continues to poll for status updates every 3 seconds

3. The user can:
   - View the progress in real-time
   - Cancel the sync operation (if implemented)
   - Navigate away and come back (the status will be preserved)

### Sync Completion

When the sync completes:

1. The progress bar changes to indicate completion status:
   - Green for successful completion
   - Red for failure

2. A summary is displayed showing:
   - Total duration of the sync
   - Total records processed
   - Number of records inserted
   - Number of records updated
   - Number of errors (if any)

3. The sync history is automatically refreshed to include the latest sync

4. The "Play" button is re-enabled for future sync operations

### Error Handling

If errors occur during the sync:

1. The UI displays an error message with details
2. The progress bar changes to red
3. The error is logged for troubleshooting
4. The user can view detailed error information in the sync history

### Sync History

The sync history section shows:

1. Date and time of each sync operation
2. Status (completed, failed)
3. Duration
4. Record counts (processed, inserted, updated, errors)
5. A button to view detailed logs for each sync operation

## Implementation Notes

The UI is implemented using:

1. React for the component structure
2. Material-UI for the visual components
3. Axios for API communication
4. React hooks for state management

The UI communicates with the backend through these endpoints:

- `GET /sync-config` - Retrieve sync configuration
- `GET /sync-history` - Retrieve sync history
- `POST /sync-table` - Start a sync operation
- `GET /sync-status` - Check the status of a sync operation

This implementation ensures a smooth and informative user experience during the TaskDetail synchronization process.
