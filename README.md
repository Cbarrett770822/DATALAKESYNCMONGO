# WMS DataLake Sync Web Application

A web application to synchronize data from Infor WMS DataLake to MongoDB Atlas.

## Overview

This application provides a user-friendly interface to synchronize data from Infor WMS DataLake to MongoDB Atlas. It allows users to configure, monitor, and trigger synchronization jobs through a web browser.

![Dashboard Screenshot](https://via.placeholder.com/800x450.png?text=WMS+DataLake+Sync+Dashboard)

## Features

- **TaskDetail Synchronization**: Sync taskdetail data from Infor WMS DataLake to MongoDB Atlas
- **Real-time Progress Tracking**: Monitor sync progress with detailed statistics
- **Sync History**: Track all sync jobs with detailed statistics
- **API Testing**: Test DataFabric API queries directly from the UI
- **Comprehensive Logging**: Detailed console logging for debugging
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

## Documentation

### General Documentation
- [Implementation Plan](IMPLEMENTATION_PLAN.md): Detailed plan for deploying and using the application
- [Development Plan](WEBAPP_DEVELOPMENT_PLAN.md): Technical overview of the application architecture
- [User Manual](USER_MANUAL.md): Comprehensive guide for end users

### Deployment Documentation
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md): Step-by-step guide for deploying the application
- [Deployment Troubleshooting](DEPLOYMENT_TROUBLESHOOTING.md): Solutions for common deployment issues
- [Deployment Summary](DEPLOYMENT_SUMMARY.md): Overview of deployment progress and next steps

### API Documentation
- [Real API Implementation](REAL_API_IMPLEMENTATION.md): Documentation of the real API implementation
- [Real API Enhancements](REAL_API_ENHANCEMENTS.md): Details of API error handling and retry mechanisms

### TaskDetail Sync Documentation
- [TaskDetail Sync Process](docs/TaskDetail_Sync_Process.md): Detailed explanation of what happens when you click Play for TaskDetail
- [TaskDetail Sync UI Flow](docs/TaskDetail_Sync_UI_Flow.md): User interface flow for TaskDetail synchronization
- [TaskDetail Sync Implementation Guide](docs/TaskDetail_Sync_Implementation_Guide.md): Technical implementation details

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)
- MongoDB Atlas account
- Infor ION API credentials

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/Cbarrett770822/DATALAKESYNC.git
   cd DATALAKESYNC
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

1. Use the deployment script:
   ```
   deploy-to-netlify.bat
   ```
   This script will guide you through the deployment process.

2. Alternatively, deploy manually:
   - Build the application: `npm run build`
   - Connect your GitHub repository to Netlify
   - Configure build settings:
     - Build command: `chmod +x build.sh && ./build.sh`
     - Publish directory: `build`
     - Functions directory: `functions`
   - Configure environment variables in Netlify dashboard
   - Deploy the application

3. After deployment:
   - Use the debug page at `/debug.html` to verify API connections
   - Check Netlify function logs for any issues

### Environment Variables

The application requires several environment variables to be set for proper operation. See [NETLIFY_ENV_SETUP.md](NETLIFY_ENV_SETUP.md) for a complete list of required environment variables and setup instructions.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Infor for providing the DataFabric API
- MongoDB Atlas for the cloud database service
- Netlify for the serverless functions and hosting
