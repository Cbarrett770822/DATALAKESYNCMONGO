# WMS DataLake Sync Web Application

A web application to synchronize data from Infor WMS DataLake to MongoDB Atlas.

## Overview

This application provides a user-friendly interface to synchronize data from Infor WMS DataLake to MongoDB Atlas. It allows users to configure, monitor, and trigger synchronization jobs through a web browser.

![Dashboard Screenshot](https://via.placeholder.com/800x450.png?text=WMS+DataLake+Sync+Dashboard)

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

## Documentation

- [Implementation Plan](IMPLEMENTATION_PLAN.md): Detailed plan for deploying and using the application
- [Development Plan](WEBAPP_DEVELOPMENT_PLAN.md): Technical overview of the application architecture
- [User Manual](USER_MANUAL.md): Comprehensive guide for end users

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

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Infor for providing the DataFabric API
- MongoDB Atlas for the cloud database service
- Netlify for the serverless functions and hosting
