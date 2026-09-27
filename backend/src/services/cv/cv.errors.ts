export class CvError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'CvError';
    this.statusCode = statusCode;
  }
}

export class InvalidPdfError extends CvError {
  constructor(message = 'The uploaded file is not a valid PDF document') {
    super(message, 400);
    this.name = 'InvalidPdfError';
  }
}

export class EmptyFileError extends CvError {
  constructor(message = 'The uploaded CV file is empty (0 bytes)') {
    super(message, 400);
    this.name = 'EmptyFileError';
  }
}

export class OversizedFileError extends CvError {
  constructor(maxSizeMb = 10) {
    super(`The uploaded file exceeds the maximum allowed size of ${maxSizeMb}MB`, 413);
    this.name = 'OversizedFileError';
  }
}

export class UnextractablePdfError extends CvError {
  constructor(
    message = 'Unable to extract text from the PDF. The document may be image-only, scanned, or encrypted.'
  ) {
    super(message, 422);
    this.name = 'UnextractablePdfError';
  }
}

export class InvalidJobDescriptionError extends CvError {
  constructor(message = 'A valid, non-empty job description is required') {
    super(message, 400);
    this.name = 'InvalidJobDescriptionError';
  }
}

export class MissingCvFileError extends CvError {
  constructor(message = 'Missing required "cv" PDF file in upload') {
    super(message, 400);
    this.name = 'MissingCvFileError';
  }
}

export class MalformedRequestError extends CvError {
  constructor(message = 'Malformed multipart/form-data request') {
    super(message, 400);
    this.name = 'MalformedRequestError';
  }
}
