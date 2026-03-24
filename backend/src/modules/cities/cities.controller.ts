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
import { CitiesResponse, CityResponse } from "./models/city.model";
import { CitiesService } from "./cities.service";

@ApiTags("cities")
@Controller("cities")
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @ApiOperation({ summary: "List cities with pagination, search and sorting" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "sortBy", required: false, enum: ["name", "population", "security", "environment", "health", "transport", "education"] })
  @ApiQuery({ name: "order", required: false, enum: ["asc", "desc"] })
  @ApiOkResponse({ type: CitiesResponse })
  @ApiBadRequestResponse({ type: ApiErrorResponse })
  @Get()
  findAll(@Query() query: GetCitiesQueryDto) {
    return this.citiesService.getCities(query);
  }

  @ApiOperation({ summary: "Get a city by INSEE code" })
  @ApiParam({ name: "code", type: String })
  @ApiOkResponse({ type: CityResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  @Get(":code")
  findOne(@Param("code") code: string) {
    return this.citiesService.getCityByCode(code);
  }
}
