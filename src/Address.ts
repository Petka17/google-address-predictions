import { AddressType, GeocodingAddressComponentType } from '@google/maps'

export type Address = {
  house: string
  street: string
  city: string
  state: string
  zip: string
}

type ComponentForm = 'short_name' | 'long_name'

export type AddressFieldsMapping<T> = {
  [key in AddressType | GeocodingAddressComponentType]?: {
    nameForm: ComponentForm
    resultField: keyof T
  }
}
