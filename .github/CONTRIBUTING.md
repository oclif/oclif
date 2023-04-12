This project uses [conventional changelog](https://conventionalcommits.org) and commits will need to fit the correct format for CI to pass and the change to be entered into the [CHANGELOG](./CHANGELOG.md) correctly.

## Test

The `test/integration` requires Github Actions to run on the various OS under test.

These tests requires keys for uploading and promoting artifacts to S3 (and testing optional functions like signing).

In GHA, set `PRESERVE_ARTIFCATS` to `true` to prevent the tests from deleting the artifacts.  This is useful if you want to retrieve them from their buckets to manually test on different systems.