# WMS DataLake Sync Web Application - User Manual

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Dashboard](#dashboard)
4. [Sync Configuration](#sync-configuration)
5. [Sync History](#sync-history)
6. [Settings](#settings)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

## Introduction

The WMS DataLake Sync Web Application is designed to synchronize data from Infor WMS DataLake to MongoDB Atlas. This user manual provides detailed instructions on how to use the application effectively.

### Purpose

The primary purpose of this application is to:
- Extract taskdetail data from Infor WMS DataLake
- Transform the data as needed
- Load the data into MongoDB Atlas
- Track sync jobs and their status
- Provide insights into the synchronized data

### User Roles

The application supports the following user roles:
- **Administrator**: Full access to all features
- **Standard User**: Access to dashboard, sync configuration, and sync history

## Getting Started

### Accessing the Application

1. Open your web browser
2. Navigate to the application URL
3. Log in with your credentials (if authentication is enabled)

### First-Time Setup

Before using the application for the first time, you should:

1. Configure connection settings:
   - MongoDB URI
   - ION Credentials Path

2. Configure sync settings:
   - Default warehouse
   - Default batch size
   - Default max records

3. (Optional) Configure schedule settings:
   - Enable scheduled sync
   - Set sync schedule

4. (Optional) Configure notification settings:
   - Enable email notifications
   - Set notification email
   - Configure notification triggers

## Dashboard

The Dashboard provides an overview of the sync status and recent sync jobs.

### Dashboard Components

1. **Quick Actions**:
   - New Sync button: Start a new sync job
   - View Sync History button: Navigate to the Sync History page

2. **Taskdetail Sync Status**:
   - Total Records: Number of records in the MongoDB collection
   - Last Sync: Date and time of the last sync job
   - Status: Current status of the sync process

3. **Recent Sync Jobs**:
   - List of the most recent sync jobs
   - Job type, status, and creation date
   - View All button to navigate to the Sync History page

### Using the Dashboard

- **Start a new sync**: Click the "New Sync" button
- **View sync history**: Click the "View Sync History" button
- **Check sync status**: View the Taskdetail Sync Status section
- **View recent jobs**: Check the Recent Sync Jobs section

## Sync Configuration

The Sync Configuration page allows you to configure and start a sync job.

### Sync Configuration Options

1. **Warehouse**: Select the warehouse ID to sync data from
2. **Task Type**: Filter by task type (e.g., Pick, Cycle Count, Load)
3. **Date Range**: Filter by start and end dates
4. **Batch Size**: Number of records to process in each batch
5. **Max Records**: Maximum number of records to sync
6. **Custom SQL Query**: Use a custom SQL query for advanced filtering

### Starting a Sync

1. Configure the sync options as needed
2. Click the "Start Sync" button
3. Monitor the sync progress on the next screen
4. View the sync results when complete

### Sync Progress

The sync progress screen shows:
- Progress percentage
- Status message
- Cancel button (if available)

### Sync Results

The sync results screen shows:
- Total records found
- Records processed
- Records inserted
- Records updated
- Error records
- Duration
- Options to start a new sync or view history

## Sync History

The Sync History page displays a list of all sync jobs with their status, progress, and results.

### Filtering Sync Jobs

You can filter sync jobs by:
- **Job Type**: Filter by job type (e.g., taskdetail, inventory)
- **Status**: Filter by status (e.g., pending, in_progress, completed, failed)

### Sync Job Details

Each sync job shows:
- Job type
- Creation date
- Status
- Records processed / total records
- Duration
- Created by

### Pagination

The sync history list is paginated. You can:
- Navigate between pages
- Change the number of jobs per page

## Settings

The Settings page allows you to configure application settings.

### Connection Settings

- **MongoDB URI**: Connection string for MongoDB Atlas
- **ION Credentials Path**: Path to the ION API credentials file

### Sync Settings

- **Default Warehouse**: Default warehouse ID for sync jobs
- **Default Batch Size**: Default number of records to process in each batch
- **Default Max Records**: Default maximum number of records to sync

### Schedule Settings

- **Enable Scheduled Sync**: Toggle to enable/disable scheduled sync
- **Schedule (Cron Expression)**: Cron expression for sync schedule
- **Enable Email Notifications**: Toggle to enable/disable email notifications
- **Notification Email**: Email address for notifications
- **Notify on Success**: Toggle to enable/disable notifications for successful sync jobs
- **Notify on Failure**: Toggle to enable/disable notifications for failed sync jobs

### Saving Settings

Click the "Save Settings" button to save your changes.

## Troubleshooting

### Common Issues

1. **Connection Issues**:
   - Check MongoDB connection string
   - Verify ION API credentials
   - Check network connectivity

2. **Sync Failures**:
   - Check error messages in sync history
   - Verify DataFabric API access
   - Check MongoDB write permissions

3. **Performance Issues**:
   - Adjust batch size and max records
   - Check MongoDB indexes
   - Optimize DataFabric queries

### Error Messages

| Error Message | Possible Cause | Solution |
|---------------|----------------|----------|
| "Failed to get token" | Invalid ION API credentials | Check ION credentials file |
| "Failed to submit query" | Invalid SQL query or DataFabric API issue | Check SQL query syntax |
| "Failed to connect to MongoDB" | Invalid MongoDB URI or network issue | Check MongoDB connection string |
| "Sync job failed" | Various issues during sync process | Check sync job details for specific error |

## FAQ

### General Questions

**Q: How often should I sync data?**  
A: It depends on your requirements. For real-time data, you might want to sync hourly. For historical analysis, daily or weekly syncs might be sufficient.

**Q: Can I sync multiple tables?**  
A: Currently, the application supports syncing the taskdetail table. Support for additional tables will be added in future updates.

**Q: How do I know if a sync was successful?**  
A: Check the sync history page. Successful syncs will have a "completed" status and show the number of records processed.

### Technical Questions

**Q: What happens if a sync job is interrupted?**  
A: The sync job will be marked as failed. You can start a new sync job to resume the process.

**Q: How can I optimize sync performance?**  
A: Adjust the batch size and max records settings. Smaller batch sizes can help with memory usage, while larger batch sizes can improve throughput.

**Q: Can I use custom SQL queries?**  
A: Yes, you can use custom SQL queries for advanced filtering. Enable the "Use Custom SQL Query" option in the sync configuration.

**Q: How do I handle large datasets?**  
A: For large datasets, consider using date filters to sync data in smaller chunks. You can also adjust the batch size and max records settings.

### Security Questions

**Q: Is my data secure during the sync process?**  
A: Yes, the application uses secure connections for both the DataFabric API and MongoDB Atlas.

**Q: Who can access the application?**  
A: Access to the application is controlled by authentication. Only authorized users can access the application.

**Q: Are my ION API credentials secure?**  
A: Yes, ION API credentials are stored securely and are not exposed to the frontend.
