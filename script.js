// =====================================================
// FOOD SAVE - JAVASCRIPT
// =====================================================


// =====================================================
// 1. GET HTML ELEMENTS
// =====================================================

const searchButton = document.getElementById("searchButton");

const locationInput = document.getElementById("locationInput");

const searchMessage = document.getElementById("searchMessage");

const foodResults = document.getElementById("foodResults");

const useLocationButton =
  document.getElementById("useLocationButton");


// =====================================================
// 2. SEARCH LOCATION
// =====================================================

// When the user clicks "Find Food"
searchButton.addEventListener("click", searchLocation);


// Allow the user to press ENTER
locationInput.addEventListener("keydown", function(event) {

  if (event.key === "Enter") {

    searchLocation();

  }

});


// =====================================================
// 3. SEARCH LOCATION FUNCTION
// =====================================================

async function searchLocation() {

  // Get the text entered by the user
  const location = locationInput.value.trim();


  // Check if the input is empty
  if (!location) {

    searchMessage.textContent =
      "Please enter a location in the UAE.";

    foodResults.innerHTML = "";

    return;
  }


  // Show loading message
  searchMessage.textContent =
    "Searching for your location...";

  foodResults.innerHTML = "";


  try {

    // OpenStreetMap location search
    const url =
      `https://nominatim.openstreetmap.org/search?` +
      `format=json` +
      `&countrycodes=ae` +
      `&limit=1` +
      `&q=${encodeURIComponent(location)}`;


    // Send request
    const response = await fetch(url, {

      headers: {
        "Accept-Language": "en"
      }

    });


    // Convert response to JSON
    const locations = await response.json();


    // If location was not found
    if (locations.length === 0) {

      searchMessage.textContent =
        "Location not found. Please try another UAE location.";

      foodResults.innerHTML = "";

      return;
    }


    // Get latitude
    const latitude =
      parseFloat(locations[0].lat);


    // Get longitude
    const longitude =
      parseFloat(locations[0].lon);


    // Get full location name
    const displayName =
      locations[0].display_name;


    // Show message
    searchMessage.textContent =
      `Finding food near ${location}...`;


    // Find nearby restaurants/cafés/bakeries
    await findNearbyFood(
      latitude,
      longitude,
      displayName
    );

  }

  catch (error) {

    console.error(error);

    searchMessage.textContent =
      "Something went wrong. Please try again.";

    foodResults.innerHTML = "";

  }

}
// =====================================================
// 4. FIND NEARBY FOOD BUSINESSES
// =====================================================

async function findNearbyFood(
  latitude,
  longitude,
  locationName
) {

  // Search within 5 kilometers
  const radius = 5000;


  // OpenStreetMap query
  const query = `

    [out:json];

    (

      node["amenity"="restaurant"]
        (around:${radius},${latitude},${longitude});

      node["amenity"="cafe"]
        (around:${radius},${latitude},${longitude});

      node["shop"="bakery"]
        (around:${radius},${latitude},${longitude});

      way["amenity"="restaurant"]
        (around:${radius},${latitude},${longitude});

      way["amenity"="cafe"]
        (around:${radius},${latitude},${longitude});

      way["shop"="bakery"]
        (around:${radius},${latitude},${longitude});

    );

    out center tags;

  `;


  // Show loading message
  foodResults.innerHTML = `

    <div class="loading">

      <div class="spinner"></div>

      <p>
        Finding nearby restaurants, cafés and bakeries...
      </p>

    </div>

  `;


  // -----------------------------------------------
  // TRY DIFFERENT OPENSTREETMAP SERVERS
  // -----------------------------------------------

  const servers = [

    "https://overpass-api.de/api/interpreter",

    "https://overpass.kumi.systems/api/interpreter",

    "https://overpass.private.coffee/api/interpreter"

  ];


  let data = null;


  // Try each server
  for (const server of servers) {

    try {

      console.log(
        "Trying OpenStreetMap server:",
        server
      );


      const response = await fetch(
        server,
        {
          method: "POST",
          body: query
        }
      );


      // If server works
      if (response.ok) {

        data = await response.json();


        console.log(
          "Successfully loaded food businesses."
        );


        break;

      }


      console.log(
        "Server did not respond:",
        server
      );

    }


    catch (error) {

      console.log(
        "Server failed:",
        server
      );

    }

  }


  // -----------------------------------------------
  // IF ALL SERVERS FAILED
  // -----------------------------------------------

  if (!data) {

    foodResults.innerHTML = `

      <div class="error-box">

        <h3>
          Unable to load nearby places
        </h3>

        <p>
          The food map service is temporarily
          unavailable. Please try again.
        </p>

      </div>

    `;

    return;

  }


  // -----------------------------------------------
  // DISPLAY RESULTS
  // -----------------------------------------------

  displayFoodResults(

    data.elements,

    latitude,

    longitude

  );

}
// =====================================================
// 5. DISPLAY FOOD RESULTS
// =====================================================

function displayFoodResults(
  places,
  userLat,
  userLon
) {


  // Check if places were found
  if (!places || places.length === 0) {

    foodResults.innerHTML = `

      <div class="no-results">

        <h3>
          No food businesses found nearby.
        </h3>

        <p>
          Try another UAE location.
        </p>

      </div>

    `;

    return;

  }


  // Keep only places that have names
  const namedPlaces =
    places.filter(function(place) {

      return (
        place.tags &&
        place.tags.name
      );

    });


  // ===================================================
  // REMOVE DUPLICATES
  // ===================================================

  const uniquePlaces = [];

  const names = new Set();


  namedPlaces.forEach(function(place) {

    const name =
      place.tags.name;


    if (!names.has(name)) {

      names.add(name);

      uniquePlaces.push(place);

    }

  });

  if (uniquePlaces.length === 0) {
    foodResults.innerHTML = `

      <div class="no-results">

        <h3>No named food businesses found nearby.</h3>

        <p>Try a larger area or another UAE location.</p>

      </div>

    `;

    return;
  }


  // ===================================================
  // CALCULATE DISTANCES
  // ===================================================

  const sortedPlaces =
    uniquePlaces

      .map(function(place) {

        const latitude =
          place.lat ||
          place.center?.lat;


        const longitude =
          place.lon ||
          place.center?.lon;


        const distance =
          calculateDistance(
            userLat,
            userLon,
            latitude,
            longitude
          );


        return {

          ...place,

          distance: distance

        };

      })


      // Sort nearest first
      .sort(function(a, b) {

        return a.distance - b.distance;

      })


      // Show maximum 12 places
      .slice(0, 12);


  // ===================================================
  // CREATE RESULTS
  // ===================================================

  foodResults.innerHTML = `

    <div class="results-header">

      <div>

        <p class="eyebrow">
          NEARBY FOOD
        </p>

        <h3>
          Food businesses near you
        </h3>

      </div>

      <span>
        ${sortedPlaces.length} places
      </span>

    </div>


    <div class="food-grid">

      ${
        sortedPlaces
          .map(function(place) {

            return createFoodCard(place);

          })
          .join("")
      }

    </div>


    <p class="data-note">

      📍 Locations are provided using
      OpenStreetMap.

      FoodSave saved-food availability will
      appear when a business lists food on
      our platform.

    </p>

  `;

}

// =====================================================
// 6. GEOLOCATION - USE MY CURRENT LOCATION
// =====================================================

useLocationButton.addEventListener("click", function() {
  // Clear any existing search message or cards
  searchMessage.textContent = "Requesting your location coordinates...";
  foodResults.innerHTML = "";

  // Check if browser supports Geolocation API
  if (!navigator.geolocation) {
    searchMessage.textContent = "Geolocation is not supported by your browser.";
    return;
  }

  // Get current device coordinates
  navigator.geolocation.getCurrentPosition(
    async function(position) {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      searchMessage.textContent = "Location detected! Finding food near you...";
      locationInput.value = "My Current Location";

      // Call your existing function to fetch from OpenStreetMap Overpass servers
      await findNearbyFood(latitude, longitude, "Your Current Location");
    },
    function(error) {
      console.error(error);
      searchMessage.textContent = "";
      
      // Error message box layout
      foodResults.innerHTML = `
        <div class="error-box">
          <h3>Unable to load nearby places</h3>
          <p>Please ensure you are running a local Live Server and have allowed browser location permissions.</p>
        </div>
      `;
    }
  );
});

// =====================================================
// 7. HELPER FUNCTION - CALCULATE DISTANCE
// =====================================================

function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  
  // Haversine Formula to calculate absolute distance in kilometers
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
}


// =====================================================
// 8. FOOD ICON
// =====================================================

function getFoodIcon(place) {


  if (
    place.tags &&
    place.tags.shop === "bakery"
  ) {

    return "🥐";

  }


  if (
    place.tags &&
    place.tags.amenity === "cafe"
  ) {

    return "☕";

  }


  return "🍽️";

}


// =====================================================
// 9. FORMAT CUISINE
// =====================================================

function formatCuisine(cuisine) {


  return cuisine

    .split(";")

    .map(function(item) {

      return item
        .replaceAll("_", " ")
        .replace(
          /\b\w/g,
          function(letter) {

            return letter.toUpperCase();

          }
        );

    })

    .join(", ");

}


// =====================================================
// 10. CALCULATE DISTANCE
// =====================================================

function calculateDistance(
  lat1,
  lon1,
  lat2,
  lon2
) {


  // Earth radius in kilometers
  const earthRadius = 6371;


  // Convert latitude difference
  const dLat =
    degreesToRadians(
      lat2 - lat1
    );


  // Convert longitude difference
  const dLon =
    degreesToRadians(
      lon2 - lon1
    );


  // Haversine formula
  const a =

    Math.sin(dLat / 2) ** 2 +

    Math.cos(
      degreesToRadians(lat1)
    ) *

    Math.cos(
      degreesToRadians(lat2)
    ) *

    Math.sin(dLon / 2) ** 2;


  const c =
    2 *

    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );


  // Return distance in kilometers
  return earthRadius * c;

}


// =====================================================
// 11. CONVERT DEGREES TO RADIANS
// =====================================================

function degreesToRadians(degrees) {

  return degrees *
    Math.PI /
    180;

}


// =====================================================
// 12. USE MY CURRENT LOCATION
// =====================================================

useLocationButton.addEventListener(
  "click",
  useCurrentLocation
);


function useCurrentLocation() {


  // Check browser support
  if (!navigator.geolocation) {

    searchMessage.textContent =
      "Your browser does not support location services.";

    return;

  }


  // Show message
  searchMessage.textContent =
    "Getting your location...";


  foodResults.innerHTML = "";


  // Ask browser for location
  navigator.geolocation.getCurrentPosition(

    // ===============================================
    // SUCCESS
    // ===============================================

    async function(position) {


      // Get latitude
      const latitude =
        position.coords.latitude;


      // Get longitude
      const longitude =
        position.coords.longitude;


      try {


        // Reverse geocoding
        // Converts coordinates into a location name
        const response = await fetch(

          `https://nominatim.openstreetmap.org/reverse?` +
          `format=json` +
          `lat=${latitude}` +
          `&lon=${longitude}`,

          {
            headers: {
              "Accept-Language": "en"
            }
          }

        );


        // Convert response to JSON
        const data =
          await response.json();


        // Get readable location
        const locationName =
          data.display_name ||
          "Your location";


        // Put location into input box
        locationInput.value =

          data.address?.suburb ||

          data.address?.neighbourhood ||

          data.address?.city ||

          data.address?.town ||

          "Your location";


        // Show message
        searchMessage.textContent =
          "Finding food near your location...";


        // Find nearby businesses
        await findNearbyFood(

          latitude,

          longitude,

          locationName

        );


      }

      catch (error) {

        console.error(error);


        searchMessage.textContent =
          "Unable to identify your location.";

      }

    },


    // ===============================================
    // ERROR
    // ===============================================

    function(error) {


      if (error.code === 1) {

        searchMessage.textContent =
          "Location permission was denied.";

      }

      else if (error.code === 2) {

        searchMessage.textContent =
          "Your location could not be determined.";

      }

      else if (error.code === 3) {

        searchMessage.textContent =
          "Location request timed out.";

      }

      else {

        searchMessage.textContent =
          "Unable to get your location.";

      }

    }

  );

}


// =====================================================
// 13. MOBILE MENU
// =====================================================

const menuToggle =
  document.querySelector(".menu-toggle");


const nav =
  document.querySelector("nav");


if (menuToggle && nav) {


  menuToggle.addEventListener(
    "click",
    function() {


      const isOpen =
        nav.style.display === "flex";


      if (isOpen) {

        nav.style.display = "";

      }

      else {

        nav.style.display = "flex";

        nav.style.flexDirection =
          "column";

        nav.style.position =
          "absolute";

        nav.style.top =
          "76px";

        nav.style.left =
          "0";

        nav.style.right =
          "0";

        nav.style.padding =
          "25px";

        nav.style.background =
          "#ffffff";

      }

    }
  );

}


// =====================================================
// 14. FINISHED
// =====================================================

console.log(
  "FoodSave website JavaScript loaded successfully!"
);