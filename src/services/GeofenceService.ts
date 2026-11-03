export class GeofenceService {
  private siteLatitude: number = 0;
  private siteLongitude: number = 0;
  private radiusMeters: number = 500;
  private static instance: GeofenceService;

  private constructor() {}

  static getInstance(): GeofenceService {
    if (!GeofenceService.instance) {
      GeofenceService.instance = new GeofenceService();
    }
    return GeofenceService.instance;
  }

  initializeSiteLocation(latitude: number, longitude: number, radius: number = 500): void {
    this.siteLatitude = latitude;
    this.siteLongitude = longitude;
    this.radiusMeters = radius;
  }

  getDistanceFromSite(userLatitude: number, userLongitude: number): number {
    const R = 6371000;
    
    const φ1 = this.siteLatitude * Math.PI / 180;
    const φ2 = userLatitude * Math.PI / 180;
    const Δφ = (userLatitude - this.siteLatitude) * Math.PI / 180;
    const Δλ = (userLongitude - this.siteLongitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  isWithinGeofence(userLatitude: number, userLongitude: number): boolean {
    const distance = this.getDistanceFromSite(userLatitude, userLongitude);
    return distance <= this.radiusMeters;
  }

  getGeofenceStatus(userLatitude: number, userLongitude: number): {
    isWithin: boolean;
    distance: number;
    radius: number;
  } {
    const distance = this.getDistanceFromSite(userLatitude, userLongitude);
    return {
      isWithin: distance <= this.radiusMeters,
      distance,
      radius: this.radiusMeters
    };
  }

  updateRadius(radius: number): void {
    if (radius > 0) {
      this.radiusMeters = radius;
    }
  }

  updateSiteLocation(latitude: number, longitude: number): void {
    this.siteLatitude = latitude;
    this.siteLongitude = longitude;
  }
}