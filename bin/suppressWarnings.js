// Suppress all process warnings
// eslint-disable-next-line @typescript-eslint/no-empty-function
process.emitWarning = () => {};
// Set other warning-related configurations
process.env.NODE_NO_WARNINGS = "1";
process.env.NODE_NO_TIMEOUT_WARNING = "1";
