import { AddressType, GeocodingAddressComponentType } from '@google/maps'

type AddressField = 'house' | 'street' | 'city' | 'state' | 'zip'

export type Address = {
  [key in AddressField]: string
}

type ComponentForm = 'short_name' | 'long_name'

type AddressFieldsMapping = {
  [key in AddressType | GeocodingAddressComponentType]?: {
    nameForm: ComponentForm
    resultField: AddressField
  }
}

export const addressFieldsMapping: AddressFieldsMapping = {
  street_number: {
    nameForm: 'short_name',
    resultField: 'house',
  },
  route: {
    nameForm: 'short_name',
    resultField: 'street',
  },
  locality: {
    nameForm: 'long_name',
    resultField: 'city',
  },
  administrative_area_level_1: {
    nameForm: 'short_name',
    resultField: 'state',
  },
  postal_code: {
    nameForm: 'short_name',
    resultField: 'zip',
  },
}
