import { AddressType, GeocodingAddressComponentType } from '@google/maps'

type ComponentForm = 'short_name' | 'long_name'

export type AddressFieldsMapping<T> = {
  [key in AddressType | GeocodingAddressComponentType]?: {
    nameForm: ComponentForm
    resultField: keyof T
  }
}
