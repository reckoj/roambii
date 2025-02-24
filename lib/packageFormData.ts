export type DepartureInfo = {
  from: string;
  time: Date;
};

export type ArrivalInfo = {
  to: string;
  time: Date;
};

export type PackageFormData = {
  image?: string;
  description: string;
  price: string;
  accommodationType: string;
  isAllInclusive: boolean;
  roomType: string;
  departureInfo: DepartureInfo;
  arrivalInfo: ArrivalInfo;
  returnTime: Date;
};
