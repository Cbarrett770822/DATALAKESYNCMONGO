# Setting Up Environment Variables in Netlify

This document provides instructions for setting up the required environment variables in Netlify for the WMS DataLake Sync Web Application.

## Required Environment Variables

### MongoDB Connection

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority` |

### ION API Credentials

| Variable | Description | Example |
|----------|-------------|---------|
| `ION_TENANT` | Infor tenant ID | `SLSGDENA131_AX2` |
| `ION_SAAK` | Service account access key | `SLSGDENA131_AX2#B_AMh_MOFYHXRGR3l1MLEeQwcH09uLlLmip8HLa4ZloF60oFZ3VOkhLYehdpeWiAeq5_gbgpcebaAkejLgxZDA` |
| `ION_SASK` | Service account secret key | `YffSA_Xqewf_4hEX7g-OhmK4AEiE_ICZE60uHrFRfjIkfTG5_1SwWbyyX3C-aQoCJblK1AxkUrCUyMD1GSXCKg` |
| `ION_CLIENT_ID` | OAuth client ID | `SLSGDENA131_AX2~SBR7-UEDJ1PO2U-ITLZQGbN1H3V8Au4ak2NMmso2EeE` |
| `ION_CLIENT_SECRET` | OAuth client secret | `L3qpMp7kR9f9OtKI5C4Gfw3KCAx4aDV4UYsMEIHansuXgauR4nsQIr5_y7x_pfZ-MImBrgi8uk8JlC6oX9uz1A` |
| `ION_API_URL` | ION API URL | `https://mingle-ionapi.inforcloudsuite.com` |
| `ION_SSO_URL` | ION SSO URL | `https://mingle-sso.inforcloudsuite.com:443/SLSGDENA131_AX2/as/` |

## Setting Up Environment Variables in Netlify

1. Log in to your Netlify account
2. Go to your site's dashboard
3. Click "Site settings"
4. Click "Environment variables" in the left sidebar
5. Click "Add variable" for each environment variable
6. Enter the variable name and value
7. Click "Save"

## Using Environment Variables in Development

For local development, create a `.env` file in the root directory of the project with the following content:

```
MONGODB_URI=your_mongodb_connection_string
ION_TENANT=your_tenant_id
ION_SAAK=your_saak
ION_SASK=your_sask
ION_CLIENT_ID=your_client_id
ION_CLIENT_SECRET=your_client_secret
ION_API_URL=your_ion_api_url
ION_SSO_URL=your_ion_sso_url
```

## Security Considerations

- Never commit your `.env` file to version control
- Use Netlify's environment variables for production
- Rotate your credentials regularly
- Use the principle of least privilege when creating service accounts
- Monitor your application for unusual activity

## Troubleshooting

If you encounter issues with environment variables:

1. Verify that all required variables are set
2. Check for typos in variable names
3. Ensure that the values are correctly formatted
4. Redeploy your application after making changes to environment variables
5. Check the Netlify function logs for errors
