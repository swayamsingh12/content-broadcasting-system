// One-shot S3 diagnostic — confirms credentials work, lists buckets + regions,
// and checks whether AWS_S3_BUCKET in .env is reachable from AWS_REGION.
//
// Run with:  node check-s3.js
// Delete this file once your upload works.
require('dotenv').config();
const {
  S3Client,
  ListBucketsCommand,
  GetBucketLocationCommand,
  HeadBucketCommand,
} = require('@aws-sdk/client-s3');

const region = process.env.AWS_REGION;
const targetBucket = process.env.AWS_S3_BUCKET;

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const main = async () => {
  console.log('--- env ---');
  console.log('AWS_REGION       :', region);
  console.log('AWS_S3_BUCKET    :', targetBucket);
  console.log(
    'AWS_ACCESS_KEY_ID:',
    (process.env.AWS_ACCESS_KEY_ID || '').slice(0, 6) + '...',
  );
  console.log();

  console.log('--- buckets visible to this IAM user ---');
  try {
    const out = await s3.send(new ListBucketsCommand({}));
    if (!out.Buckets || out.Buckets.length === 0) {
      console.log('(none — IAM user has no buckets or lacks s3:ListAllMyBuckets)');
    }
    for (const b of out.Buckets || []) {
      let bucketRegion = '?';
      try {
        const loc = await s3.send(
          new GetBucketLocationCommand({ Bucket: b.Name }),
        );
        // AWS returns null for us-east-1 (legacy) and "EU" for eu-west-1 (legacy).
        bucketRegion = loc.LocationConstraint || 'us-east-1';
      } catch (e) {
        bucketRegion = `<error: ${e.name}>`;
      }
      const marker = b.Name === targetBucket ? '  <-- AWS_S3_BUCKET' : '';
      console.log(`  ${b.Name}  [${bucketRegion}]${marker}`);
    }
  } catch (e) {
    console.log('FAILED to list buckets:', e.name, '-', e.message);
    if (e.name === 'InvalidAccessKeyId' || e.name === 'SignatureDoesNotMatch') {
      console.log(
        '\n>>> Your AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY are invalid.',
      );
    }
    process.exit(1);
  }

  console.log();
  console.log(`--- HEAD on AWS_S3_BUCKET="${targetBucket}" using region="${region}" ---`);
  try {
    await s3.send(new HeadBucketCommand({ Bucket: targetBucket }));
    console.log('OK — bucket reachable from this region.');
    console.log('Your upload should work. If it still 500s, paste the new error.');
  } catch (e) {
    console.log('FAILED:', e.name, '-', e.message);
    if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) {
      console.log(
        '\n>>> The bucket does NOT exist (or you have no access from this account).',
      );
      console.log('    Pick a name from the list above, OR create a new bucket,');
      console.log('    then set AWS_S3_BUCKET in .env to that exact name.');
    } else if (
      e.name === 'PermanentRedirect' ||
      e.$metadata?.httpStatusCode === 301
    ) {
      console.log(
        '\n>>> The bucket exists but is in a DIFFERENT region.',
      );
      console.log('    Find it in the bucket list above and update AWS_REGION in .env.');
    } else if (e.$metadata?.httpStatusCode === 403) {
      console.log(
        '\n>>> Access denied. The bucket exists but this IAM user lacks',
      );
      console.log('    s3:HeadBucket / s3:GetObject / s3:PutObject on it.');
    }
  }
};

main().catch((e) => {
  console.error('unexpected:', e);
  process.exit(1);
});
