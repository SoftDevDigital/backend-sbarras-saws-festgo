export interface IPriceListItem {
  productId: string;
  unitPrice: number;
  taxRate?: number;
}

export interface IPriceList {
  id: string;
  name: string;
  description?: string;
  eventId?: string;
  items: IPriceListItem[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
