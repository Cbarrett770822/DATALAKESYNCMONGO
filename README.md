# WMS DataLake Sync Web Application

A web application to synchronize data from Infor WMS DataLake to MongoDB Atlas.

## Features

- **Data Synchronization**: Sync taskdetail data from Infor WMS DataLake to MongoDB Atlas
- **Configurable Sync**: Filter by warehouse, task type, date range, and more
- **Dashboard**: View sync status and history at a glance
- **Sync History**: Track all sync jobs with detailed statistics
- **Settings Management**: Configure connection, sync, schedule, and notification settings
- **Responsive UI**: Modern Material UI design that works on desktop and mobile

## Tech Stack

### Frontend
- React 18
- Material UI 5
- Redux Toolkit
- React Router 6
- Axios
- Recharts for data visualization

### Backend
- Netlify Functions (serverless)
- MongoDB with Mongoose
- JWT authentication
- Infor ION API integration

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)
- MongoDB Atlas account
- Infor ION API credentials

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd webapp
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   MONGODB_URI=your_mongodb_connection_string
   ION_CREDENTIALS_PATH=path_to_your_ion_credentials_file
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Deployment

### Netlify Deployment

1. Build the application:
   ```
   npm run build
   ```

2. Deploy to Netlify:
   - Connect your GitHub repository to Netlify
   - Configure build settings:
     - Build command: `npm run build`
     - Publish directory: `build`
     - Functions directory: `functions`
   - Configure environment variables in Netlify dashboard
   - Deploy the application

## Usage

### Dashboard

The Dashboard provides an overview of the sync status and recent sync jobs. It also offers quick actions to start a new sync or view sync history.

### Sync Configuration

The Sync Configuration page allows you to configure and start a sync job:

1. Select the warehouse ID
2. Choose a task type (optional)
3. Set date range filters (optional)
4. Configure batch size and max records
5. Use custom SQL query if needed
6. Click "Start Sync" to begin the synchronization process

### Sync History

The Sync History page displays a list of all sync jobs with their status, progress, and results. You can filter the list by job type and status.

### Settings

The Settings page allows you to configure application settings:

1. Connection settings: MongoDB URI and ION Credentials Path
2. Sync settings: Default warehouse, batch size, and max records
3. Schedule settings: Enable scheduled sync and set cron expression
4. Notification settings: Configure email notifications

## Project Structure

```
webapp/
├── functions/              # Netlify serverless functions
│   ├── models/             # MongoDB schemas
│   ├── utils/              # Utility functions
│   ├── get-token.js        # Get ION API token
│   ├── submit-query.js     # Submit query to DataFabric
│   └── ...                 # Other API endpoints
├── public/                 # Static files
├── src/
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   ├── store/              # Redux store
│   ├── utils/              # Utility functions
│   ├── App.js              # Main App component
│   └── index.js            # Entry point
├── .env                    # Environment variables
├── netlify.toml            # Netlify configuration
└── package.json            # Project dependencies
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Infor for providing the DataFabric API
- MongoDB Atlas for the cloud database service
- Netlify for the serverless functions and hosting
