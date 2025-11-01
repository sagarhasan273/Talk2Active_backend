export type ReturnResponseType = {
  message: string;
  status: boolean;
} | {
  data: any;
  metaData: {
    page: number,
    limit: number,
    total: number,
    totalPages: number,
    hasNextPage: boolean,
    hasPrevPage: boolean
  }
};
