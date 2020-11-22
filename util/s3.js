const aws = require("aws-sdk");

aws.config.update({ region: process.env.AWS_REGION });
const s3 = new aws.S3({ apiVersion: "2006-03-01" });

/**
 * Deletes the S3 object with a specific key from the bucket.
 *
 * @param {String} key s3 key for the object to delete
 */
const deleteS3Object = (key) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  };

  s3.deleteObject(params, (err, data) => {
    if (err) throw err;
  });
};

exports.deleteS3Object = deleteS3Object;
