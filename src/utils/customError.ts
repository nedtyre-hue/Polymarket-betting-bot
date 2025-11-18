import { TCustomError } from '@/types/index';

class CustomError extends Error implements TCustomError {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode || 500;
    }
}
export default CustomError;