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
import { GetCitiesQueryDto } from "../cities/dto/get-cities-query.dto";
import { CitiesResponse } from "../cities/models/city.model";
import {
  DepartementResponse,
  DepartementsResponse
} from "./models/departement.model";
import { DepartementsService } from "./departements.service";

@ApiTags("departements")
@Controller("departements")
export class DepartementsController {
  constructor(private readonly departementsService: DepartementsService) {}

  @ApiOperation({ summary: "List departements available in PostgreSQL" })
  @ApiOkResponse({ type: DepartementsResponse, description: "Departement list with computed city counts" })
  @Get()
  findAll() {
    return this.departementsService.findAll();
  }

  @ApiOperation({ summary: "List cities for one departement with the standard city filters" })
  @ApiParam({ name: "code", type: String, example: "75" })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 20 })
  @ApiQuery({
    name: "search",
    required: false,
    type: String,
    description: "Search by INSEE code or city name within the departement",
    example: "Paris"
  })
  @ApiQuery({
    name: "nom_region",
    required: false,
    type: String,
    description: "Optional region filter applied in addition to the departement scope",
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
    description: "Sort key. code_dept is forced from the path parameter."
  })
  @ApiQuery({
    name: "order",
    required: false,
    enum: ["asc", "desc"],
    example: "asc"
  })
  @ApiOkResponse({ type: CitiesResponse, description: "Paginated cities scoped to one departement" })
  @ApiBadRequestResponse({ type: ApiErrorResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  @Get(":code/cities")
  findCities(@Param("code") code: string, @Query() query: GetCitiesQueryDto) {
    return this.departementsService.findCities(code, query);
  }

  @ApiOperation({ summary: "Get a departement by code" })
  @ApiParam({ name: "code", type: String, example: "75" })
  @ApiOkResponse({ type: DepartementResponse, description: "Single departement with computed city count" })
  @ApiBadRequestResponse({ type: ApiErrorResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  @Get(":code")
  findOne(@Param("code") code: string) {
    return this.departementsService.findOne(code);
  }
}
