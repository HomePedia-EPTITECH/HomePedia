export class InvalidReviewCursorError extends Error {
  constructor(message = "Invalid cursor") {
    super(message);
    this.name = "InvalidReviewCursorError";
  }
}
