import React from 'react'

import { PlaceDetailsResult, PlaceDetailsResponseStatus, PlaceAutocompleteResult, AddressComponent } from '@google/maps'

import { AddressFieldsMapping } from './Address'

declare global {
  interface Window {
    google?: any
  }
}

type Language = 'en' | 'ru' | 'ua'
type Country = 'us' | 'ru'

const LANGUAGE: Language = 'en'
const COUNTRY: Country = 'us'
const MIN_LEN = 5
const DEBOUNCE = 500

/**
 * Conversion from Google `PlaceResult` to more simple object with address fields.
 */
const mappingPlaceToAddress = <T>(mapping: AddressFieldsMapping<T>) => (place: PlaceDetailsResult): Partial<T> =>
  place.address_components.reduce((result: Partial<T>, addressComponent: AddressComponent) => {
    const addressComponentType = addressComponent.types[0]

    const fieldSettings = mapping[addressComponentType]

    if (!fieldSettings) return result

    const { nameForm, resultField } = fieldSettings

    return {
      ...result,
      [resultField]: `${addressComponent[nameForm]}`,
    }
  }, {})

/**
 * Custom React hook for initialization of Google Places Services.
 */
const useInitPlaceServices = (key: string, language: Language) => {
  const serviceRef = React.useRef<{ autocomplete: any; places: any; statusOK: PlaceDetailsResponseStatus } | null>(null)

  /**
   * Place Service init function.
   */
  const initService = () => {
    serviceRef.current = {
      /**
       * `AutocompleteService` has `getPlacePredictions` function
       * that finds address suggestions and pass them to a callback function
       */
      autocomplete: new window.google.maps.places.AutocompleteService(),
      /**
       * Passing empty div here is a bit of a hack.
       * `PlacesService` sets on some attributes on this HTMLElement.
       * These attributes might be useful if there is a map.
       * https://developers.google.com/maps/documentation/javascript/reference/places-service#PlacesService.constructor
       */
      places: new window.google.maps.places.PlacesService(document.createElement('div')),
      /**
       * This constant used for checking the result status
       * of `getPlacePredictions` function call
       */
      statusOK: window.google.maps.places.PlacesServiceStatus.OK,
    }
  }

  /**
   * This hook initializes Google Places API after the component mounted
   * if the API wasn't initialized before.
   */
  React.useEffect(() => {
    if (!key) return

    if (!window?.google?.maps?.places) {
      const script = document.createElement('script')

      script.type = 'text/javascript'
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&language=${language}`
      script.addEventListener('load', initService)

      document.getElementsByTagName('body')[0].append(script)

      return () => script.removeEventListener('load', initService)
    }

    initService()
  }, [])

  return serviceRef.current
}

const useGoogleAutocompleteSuggestions = <T>({
  key,
  language = LANGUAGE,
  country = COUNTRY,
  minLength = MIN_LEN,
  debounce = DEBOUNCE,
  mapping,
  cb,
}: {
  key: string
  language?: Language
  country?: Country
  minLength?: number
  debounce?: number
  mapping: AddressFieldsMapping<T>
  cb: (address: Partial<T>) => void
}) => {
  const [input, setInput] = React.useState('')
  const [suggestions, setSuggestions] = React.useState<{ placeId: string; description: string }[]>([])

  const placeServices = useInitPlaceServices(key, language)

  const convertPlaceToAddress = mappingPlaceToAddress(mapping)

  const processResults = (results: PlaceAutocompleteResult[], status: PlaceDetailsResponseStatus) => {
    if (placeServices && placeServices.statusOK === status) {
      setSuggestions(
        results.map(result => ({
          placeId: result.place_id,
          description: result.description,
        })),
      )
    }
  }

  /**
   * Run this effect every time input changes.
   * Setup timeout for debouncing API calls.
   * Run `getPlacePredictions` only if place services are initialized and
   * the length of `input` greater than `minLength`
   */
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (placeServices && input.length > minLength) {
        placeServices.autocomplete.getPlacePredictions(
          {
            componentRestrictions: { country },
            types: ['address'],
            input,
          },
          processResults,
        )
      }
    }, debounce)

    return () => {
      clearTimeout(timeout)
    }
  }, [input])

  const getPlace = (placeId: string) => {
    if (!placeServices) return

    placeServices.places.getDetails(
      {
        placeId,
        fields: ['address_component'],
      },
      (place: PlaceDetailsResult) => {
        cb(convertPlaceToAddress(place))
      },
    )
  }

  return { input, setInput, suggestions, getPlace }
}

export default useGoogleAutocompleteSuggestions
