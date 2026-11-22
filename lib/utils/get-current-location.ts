export interface ReportLocation {
  lat: number;
  lng: number;
  address: string;
  zone: string;
}

export function getCurrentLocation(): Promise<ReportLocation> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      reject(
        new Error(
          "Location services are unavailable. Enable location access or try another device.",
        ),
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        resolve({
          lat: latitude,
          lng: longitude,
          address: `GPS coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          zone: "Not determined",
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(
              new Error(
                "Location permission was denied. Allow location access in your browser and try again.",
              ),
            );
            break;
          case error.POSITION_UNAVAILABLE:
            reject(
              new Error(
                "Your current location could not be determined. Please try again in an area with better GPS reception.",
              ),
            );
            break;
          case error.TIMEOUT:
            reject(
              new Error("Location detection timed out. Please try again."),
            );
            break;
          default:
            reject(new Error("Unable to obtain your current location."));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      },
    );
  });
}
