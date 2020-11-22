# Social Network REST API

REST API for a Social Network App, built with NodeJS, mongoDB and AWS S3. Frontend built with React. Uses JWT for authentication.

### Hosted Example

REST API:

Full App:

### Frontend

The code for the React frontend App is in the frontend folder. Follow the README in that folder to run.

## Setup

### AWS S3

- Create an S3 bucket that allows public files
- Add your AWS credentials, and bucket settings to the .env file, as described below

NOTE: The AWS SDK will automatically get your credentials from the environment variables, so it is unnecessary to configure them in the application.

Add the following bucket policy, so that the images are publicly accessible:

    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "PublicRead",
                "Effect": "Allow",
                "Principal": "*",
                "Action": [
                    "s3:GetObject",
                    "s3:GetObjectVersion"
                ],
                "Resource": "arn:aws:s3:::YOUR_AWS_BUCKET_NAME/*"
            }
        ]
    }

### Environment Variables

Create a .env file in the main directory with the following environment variables:

    MONGODB_CONNECTION=your_mongo_connection_string
    AWS_ACCESS_KEY_ID=your_aws_access_key
    AWS_SECRET_ACCESS_KEY=your_secret_access_key
    AWS_REGION=your_s3_bucket_region
    AWS_BUCKET_NAME=your_s3_bucket_name
    JWT_SECRET_KEY=some_secret_key_for_signing_jwt

## Install

    npm install

## Run

    npm start

## REST API Endpoints

<table>
    <thead>
        <tr>
            <th>Method</th>
            <th>Route</th>
            <th>Description</th>
            <th>Request Body</th>
        </tr>
    </thead>
    <tr>
        <td>GET</td>
        <td>/feed/posts</td>
        <td>Get all of the posts.</td>
        <td>None</td>
    </tr>
    <tr>
        <td>POST</td>
        <td>/feed/post</td>
        <td>Create a new post.</td>
        <td>Should be multipart/form-data. Fields: title, content, image</td>
    </tr>
    <tr>
        <td>GET</td>
        <td>/feed/post/:postId</td>
        <td>Get details for a specific post.</td>
        <td>None</td>
    </tr>
    <tr>
        <td>PUT</td>
        <td>/feed/post/:postId</td>
        <td>Replace a specific post.</td>
        <td>Should be multipart/form-data. Fields: title, content, image -> all optional</td>
    </tr>
    <tr>
        <td>DELETE</td>
        <td>/feed/post/:postId</td>
        <td>Deletes a specific post.</td>
        <td>None</td>
    </tr>
    <tr>
        <td>PUT</td>
        <td>/auth/signup</td>
        <td>Sign up a new user.</td>
        <td>Should be application/json. Fields: email, password, name</td>
    </tr>
    <tr>
        <td>POST</td>
        <td>/auth/login</td>
        <td>Log in a user.</td>
        <td>Should be application/json. Fields: email, password</td>
    </tr>
    <tr>
        <td>GET</td>
        <td>/auth/status</td>
        <td>Get the status for the user.</td>
        <td>None</td>
    </tr>
    <tr>
        <td>POST</td>
        <td>/auth/status</td>
        <td>Update the status for the user.</td>
        <td>Should be application/json. Fields: status</td>
    </tr>
</table>
