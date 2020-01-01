import React from 'react'

/**
 * Conversion from Google `PlaceResult` to more simple object with address fields.
 *
 * @param {PlaceResult} place instance of `PlaceResult` with `address_components` field
 * @return {Object} Return an object with the following fields: `house`, `street`, `city`, `state`, `zip`
 */
const convertPlaceToAddress = place => {
  const fieldsMapping = {
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

  const result = {}

  for (let i = 0; i < place.address_components.length; i++) {
    const addressComponent = place.address_components[i]
    const addressComponentType = addressComponent.types[0]
    const fieldSettings = fieldsMapping[addressComponentType]

    if (fieldSettings) {
      const { nameForm, resultField } = fieldSettings
      result[resultField] = addressComponent[nameForm]
    }
  }

  Object.keys(fieldsMapping)
    .reduce((fields, key) => [...fields, fieldsMapping[key].resultField], [])
    .forEach(field => {
      if (!result[field]) result[field] = ''
    })

  return result
}

/**
 * Custom React hook for initialization of Google Places Services.
 *
 * @param {string} key Google Map API key
 * @param {Language} language language for result localization
 * @return React hook reference to an object with initialized place services and constants
 */
const useInitPlaceServices = (key, language) => {
  const serviceRef = React.useRef(null)

  /**
   * Place Service init function.
   */
  const initService = () => {
    serviceRef.current = {
      /**
       * `AutocompleteService` has `getPlacePredictions` function
       * that finds predictions and pass them to a callback function
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

    if (!window.google) {
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

const LANGUAGE = 'en'
const COUNTRY = 'us'
const MIN_LEN = 5
const DEBOUNCE = 500

/**
 * Custom React hook for working with suggestions
 * and getting details for places
 *
 * @param {string} key Google Map API key
 * @param {Language} language language for result localization
 * @param {Country} country country for restricting place predictions
 * @param {number} debounce how long should we wait until fire
 */
const useGoogleAutocompleteSuggestions = ({
  key,
  language = LANGUAGE,
  country = COUNTRY,
  minLength = MIN_LEN,
  debounce = DEBOUNCE,
}) => {
  const [suggestions, setSuggestions] = React.useState([])
  const [input, setInput] = React.useState('')
  const placeServices = useInitPlaceServices(key, language)

  /**
   *
   * @param {|null} results if
   * @param {PlacesServiceStatus} status Status of `getPlacePredictions` call
   */
  const processResults = (results, status) => {
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

  /**
   *
   * @param {string} placeId correct place id that we have on each suggestion
   */
  const getPlace = (placeId, cb) => {
    if (!placeServices) return

    placeServices.places.getDetails(
      {
        placeId,
        fields: ['address_component'],
      },
      place => {
        cb(convertPlaceToAddress(place))
      },
    )
  }

  return { input, setInput, suggestions, getPlace }
}

//-----
const App = () => {
  const [{ house, street, city, state, zip }, updateAddress] = React.useReducer(
    (state, newValues) => ({ ...state, ...newValues }),
    {
      house: '',
      street: '',
      city: '',
      state: '',
      zip: '',
    },
  )

  const { input, setInput, suggestions, getPlace } = useGoogleAutocompleteSuggestions({
    key: process.env.GOOGLE_MAPS_API_KEY,
  })

  const onInput = e => {
    setInput(e.target.value)
  }

  const handleAddressClick = placeId => () => getPlace(placeId, updateAddress)

  return (
    <React.Fragment>
      <div className="locationField">
        <input
          id="autocomplete"
          className="autocomplete"
          placeholder="Enter your address"
          type="text"
          autoComplete="new-password"
          value={input}
          onChange={onInput}
        />
      </div>

      <table className="address">
        <tbody>
          <tr>
            <td className="label">Street address</td>
            <td className="slimField">
              <input className="field" value={house} readOnly />
            </td>
            <td className="wideField" colSpan="2">
              <input className="field" value={street} readOnly />
            </td>
          </tr>
          <tr>
            <td className="label">City</td>
            <td className="wideField" colSpan="3">
              <input className="field" value={city} readOnly />
            </td>
          </tr>
          <tr>
            <td className="label">State</td>
            <td className="slimField">
              <input className="field" value={state} readOnly />
            </td>
            <td className="label">Zip code</td>
            <td className="wideField">
              <input className="field" value={zip} readOnly />
            </td>
          </tr>
        </tbody>
      </table>
      <ul>
        {suggestions.map(({ placeId, description }) => (
          <li key={placeId} onClick={handleAddressClick(placeId)}>
            {description}
          </li>
        ))}
      </ul>
    </React.Fragment>
  )
}

export default App
