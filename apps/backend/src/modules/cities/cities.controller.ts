import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags
} from "@nestjs/swagger";
import { ApiErrorResponse } from "../../models/api-error.model";
import { GetCitiesQueryDto } from "./dto/get-cities-query.dto";
import { CitiesResponse, CityDetailResponse, CityResponse } from "./models/city.model";
import { CitiesService } from "./cities.service";

@ApiTags("cities")
@Controller("cities")
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @ApiOperation({ summary: "List cities from PostgreSQL with search, filters and pagination" })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 20 })
  @ApiQuery({
    name: "search",
    required: false,
    type: String,
    description: "Search by INSEE code or city name",
    example: "Paris"
  })
  @ApiQuery({
    name: "code_dept",
    required: false,
    type: String,
    description: "Filter by departement code",
    example: "75"
  })
  @ApiQuery({
    name: "nom_region",
    required: false,
    type: String,
    description: "Case-insensitive exact match on region name",
    example: "Ile-de-France"
  })
  @ApiQuery({
    name: "note_moyenne_globale_min",
    required: false,
    type: Number,
    description: "Minimum global city score from PostgreSQL",
    example: 3.5
  })
  @ApiQuery({
    name: "nb_avis_min",
    required: false,
    type: Number,
    description: "Minimum review count from Mongo reviews_raw",
    example: 100
  })
  @ApiQuery({
    name: "prix_m2_maison_max",
    required: false,
    type: Number,
    description: "Maximum house price per square meter",
    example: 5000
  })
  @ApiQuery({
    name: "prix_m2_appartement_max",
    required: false,
    type: Number,
    description: "Maximum apartment price per square meter",
    example: 4500
  })
  @ApiQuery({
    name: "sortBy",
    required: false,
    enum: ["name", "population", "security", "environment", "health", "transport", "education"],
    description: "Sort key. health and transport are kept for API stability and may be null."
  })
  @ApiQuery({
    name: "order",
    required: false,
    enum: ["asc", "desc"],
    example: "asc"
  })
  @ApiOkResponse({ type: CitiesResponse, description: "Paginated city list for search and ranking UIs" })
  @ApiBadRequestResponse({ type: ApiErrorResponse })
  @Get()
  findAll(@Query() query: GetCitiesQueryDto) {
    return this.citiesService.getCities(query);
  }

  @ApiOperation({ summary: "Get a rich city payload by INSEE code from PostgreSQL, enriched with Mongo reviews" })
  @ApiParam({ name: "code", type: String, example: "75056" })
  @ApiOkResponse({ type: CityDetailResponse, description: "Detailed city payload assembled from PostgreSQL and reviews data" })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  @Get(":code/details")
  findDetails(@Param("code") code: string) {
    return this.citiesService.getCityDetailsByCode(code);
  }

  @ApiOperation({ summary: "Get a city by INSEE code" })
  @ApiParam({ name: "code", type: String, example: "75056" })
  @ApiOkResponse({ type: CityResponse, description: "Lightweight city payload for cards and lists" })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  @Get(":code")
  findOne(@Param("code") code: string) {
    return this.citiesService.getCityByCode(code);
  }
}
