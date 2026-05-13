import type {
  CustomerProfileCityOption,
  CustomerProfileUfOption,
} from "@/lib/customer-profile-contracts";

export type CustomerRegistrationLocationsResponse = {
  ok: true;
  data: {
    ufs: CustomerProfileUfOption[];
    cities: CustomerProfileCityOption[];
    selectedUf: string | null;
  };
};
