import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../core/prisma.service';
import { Client } from '@googlemaps/google-maps-services-js';
import { ValidateAddressDto, AutocompleteDto } from './dto/validate-address.dto';

@Injectable()
export class ShippingService {
    private readonly logger = new Logger(ShippingService.name);
    private readonly googleMapsClient: Client;
    private readonly googleMapsApiKey: string;

    // Egyptian cities database (fallback)
    private readonly egyptianCities = [
        'Cairo', 'Alexandria', 'Giza', 'Shubra El Kheima', 'Port Said',
        'Suez', 'Luxor', 'Mansoura', 'El-Mahalla El-Kubra', 'Tanta',
        'Asyut', 'Ismailia', 'Faiyum', 'Zagazig', 'Aswan',
        'Damietta', 'Damanhur', 'Minya', 'Beni Suef', 'Qena',
        'Sohag', 'Hurghada', 'Shibin El Kom', 'Banha', 'Kafr El Sheikh',
        '10th of Ramadan City', '6th of October City', 'Obour City',
        'New Cairo', 'Nasr City', 'Heliopolis', 'Maadi', 'Zamalek',
    ];

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {
        this.googleMapsApiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY') || '';
        this.googleMapsClient = new Client({});
    }

    /**
     * Validate address using Google Maps Geocoding API
     */
    async validateAddress(dto: ValidateAddressDto) {
        const fullAddress = `${dto.address}, ${dto.city}, ${dto.country}`;

        // If Google Maps API key is not configured, use fallback validation
        if (!this.googleMapsApiKey) {
            this.logger.warn('Google Maps API key not configured, using fallback validation');
            return this.fallbackValidation(dto);
        }

        try {
            const response = await this.googleMapsClient.geocode({
                params: {
                    address: fullAddress,
                    key: this.googleMapsApiKey,
                },
            });

            if (response.data.results.length === 0) {
                return {
                    valid: false,
                    message: 'Address not found',
                    suggestions: [],
                };
            }

            const result = response.data.results[0];
            const location = result.geometry.location;

            // Extract address components
            const addressComponents = result.address_components;
            const city = this.extractComponent(addressComponents, 'locality') || dto.city;
            const governorate = this.extractComponent(addressComponents, 'administrative_area_level_1');
            const country = this.extractComponent(addressComponents, 'country');

            return {
                valid: true,
                formattedAddress: result.formatted_address,
                coordinates: {
                    lat: location.lat,
                    lng: location.lng,
                },
                components: {
                    city,
                    governorate,
                    country,
                },
                zone: await this.detectZone(city),
            };
        } catch (error) {
            this.logger.error('Google Maps API error:', error.message);
            return this.fallbackValidation(dto);
        }
    }

    /**
     * Autocomplete address suggestions
     */
    async autocomplete(dto: AutocompleteDto) {
        if (!this.googleMapsApiKey) {
            // Return city matches from local database
            const matches = this.egyptianCities.filter((city) =>
                city.toLowerCase().includes(dto.query.toLowerCase()),
            );
            return {
                suggestions: matches.slice(0, 5).map((city) => ({
                    description: `${city}, Egypt`,
                    city,
                })),
            };
        }

        try {
            const response = await this.googleMapsClient.placeAutocomplete({
                params: {
                    input: dto.query,
                    components: [`country:${(dto.country ?? 'Egypt').toLowerCase()}`],
                    key: this.googleMapsApiKey,
                },
            });

            return {
                suggestions: response.data.predictions.map((prediction) => ({
                    description: prediction.description,
                    placeId: prediction.place_id,
                })),
            };
        } catch (error) {
            this.logger.error('Autocomplete error:', error.message);
            return { suggestions: [] };
        }
    }

    /**
     * List all supported cities
     */
    async listCities() {
        // Get unique cities from shipping zones
        const zones = await this.prisma.shippingZone.findMany({
            where: { isActive: true },
            select: { cities: true, name: true },
        });

        const citiesMap = new Map<string, string>();
        zones.forEach((zone) => {
            zone.cities.forEach((city) => {
                citiesMap.set(city, zone.name);
            });
        });

        return Array.from(citiesMap.entries()).map(([city, zone]) => ({
            city,
            zone,
        }));
    }

    /**
     * Detect shipping zone for a city
     */
    private async detectZone(city: string): Promise<string | null> {
        const zone = await this.prisma.shippingZone.findFirst({
            where: {
                cities: { has: city },
                isActive: true,
            },
            select: { name: true },
        });

        return zone?.name || null;
    }

    /**
     * Fallback validation when Google Maps is not available
     */
    private fallbackValidation(dto: ValidateAddressDto) {
        const cityMatch = this.egyptianCities.find(
            (c) => c.toLowerCase() === dto.city.toLowerCase(),
        );

        if (!cityMatch) {
            return {
                valid: false,
                message: 'City not found in supported cities list',
                suggestions: this.egyptianCities
                    .filter((c) => c.toLowerCase().includes(dto.city.toLowerCase().substring(0, 3)))
                    .slice(0, 3),
            };
        }

        return {
            valid: true,
            formattedAddress: `${dto.address}, ${cityMatch}, Egypt`,
            components: {
                city: cityMatch,
                country: 'Egypt',
            },
            zone: null, // Will be detected separately
            message: 'Validated using local database (Google Maps not configured)',
        };
    }

    /**
     * Extract component from Google Maps address components
     */
    private extractComponent(components: any[], type: string): string | null {
        const component = components.find((c) => c.types.includes(type));
        return component?.long_name || null;
    }
}
