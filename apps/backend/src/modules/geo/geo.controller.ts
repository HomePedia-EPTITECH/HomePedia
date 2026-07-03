import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags
} from "@nestjs/swagger";
import { GetCitiesQueryDto } from "./dto/get-cities-query.dto";
import {
  CityDetailResponseDto,
  CityResponseDto,
  CitiesResponseDto
} from "./dto/city-response.dto";
import {
  DepartementResponseDto,
  DepartementsResponseDto
} from "./dto/departement-response.dto";
import {
  RegionResponseDto,
  RegionsResponseDto
} from "./dto/region-response.dto";
import { GeoService } from "./geo.service";

@ApiTags("cities")
@Controller("api/cities")
export class GeoCitiesController {
  constructor(private readonly geoService: GeoService) {}

  @Get()
  @ApiOperation({ summary: "List cities" })
  @ApiQuery({ type: GetCitiesQueryDto })
  @ApiOkResponse({ type: CitiesResponseDto })
  @ApiBadRequestResponse({ description: "Invalid query parameters" })
  @ApiServiceUnavailableResponse({ description: "Cities data source unavailable" })
  findAll(@Query() query: GetCitiesQueryDto) {
    return this.geoService.getCities(query);
  }

  @Get(":code/details")
  @ApiOperation({ summary: "Get city details" })
  @ApiParam({ name: "code", example: "75056" })
  @ApiOkResponse({ type: CityDetailResponseDto })
  @ApiNotFoundResponse({ description: "City not found" })
  @ApiServiceUnavailableResponse({ description: "Cities data source unavailable" })
  findDetails(@Param("code") code: string) {
    return this.geoService.getCityDetailsByCode(code);
  }

  @Get(":code")
  @ApiOperation({ summary: "Get city" })
  @ApiParam({ name: "code", example: "75056" })
  @ApiOkResponse({ type: CityResponseDto })
  @ApiNotFoundResponse({ description: "City not found" })
  @ApiServiceUnavailableResponse({ description: "Cities data source unavailable" })
  findOne(@Param("code") code: string) {
    return this.geoService.getCityByCode(code);
  }
}

@ApiTags("departements")
@Controller("api/departements")
export class GeoDepartementsController {
  constructor(private readonly geoService: GeoService) {}

  @Get()
  @ApiOperation({ summary: "List departements" })
  @ApiOkResponse({ type: DepartementsResponseDto })
  @ApiServiceUnavailableResponse({ description: "Departements data source unavailable" })
  findAll() {
    return this.geoService.getDepartements();
  }

  @Get(":code/cities")
  @ApiOperation({ summary: "List departement cities" })
  @ApiParam({ name: "code", example: "75" })
  @ApiQuery({ type: GetCitiesQueryDto })
  @ApiOkResponse({ type: CitiesResponseDto })
  @ApiBadRequestResponse({ description: "Invalid query parameters" })
  @ApiNotFoundResponse({ description: "Departement not found" })
  @ApiServiceUnavailableResponse({ description: "Departements data source unavailable" })
  findCities(@Param("code") code: string, @Query() query: GetCitiesQueryDto) {
    return this.geoService.getDepartementCities(code, query);
  }

  @Get(":code")
  @ApiOperation({ summary: "Get departement" })
  @ApiParam({ name: "code", example: "75" })
  @ApiOkResponse({ type: DepartementResponseDto })
  @ApiNotFoundResponse({ description: "Departement not found" })
  @ApiServiceUnavailableResponse({ description: "Departements data source unavailable" })
  findOne(@Param("code") code: string) {
    return this.geoService.getDepartementByCode(code);
  }
}

@ApiTags("regions")
@Controller("api/regions")
export class GeoRegionsController {
  constructor(private readonly geoService: GeoService) {}

  @Get()
  @ApiOperation({ summary: "List regions" })
  @ApiOkResponse({ type: RegionsResponseDto })
  @ApiServiceUnavailableResponse({ description: "Regions data source unavailable" })
  findAll() {
    return this.geoService.getRegions();
  }

  @Get(":code/departements")
  @ApiOperation({ summary: "List region departements" })
  @ApiParam({ name: "code", example: "11" })
  @ApiOkResponse({ type: DepartementsResponseDto })
  @ApiNotFoundResponse({ description: "Region not found" })
  @ApiServiceUnavailableResponse({ description: "Regions data source unavailable" })
  findDepartements(@Param("code") code: string) {
    return this.geoService.getRegionDepartements(code);
  }

  @Get(":code")
  @ApiOperation({ summary: "Get region" })
  @ApiParam({ name: "code", example: "11" })
  @ApiOkResponse({ type: RegionResponseDto })
  @ApiNotFoundResponse({ description: "Region not found" })
  @ApiServiceUnavailableResponse({ description: "Regions data source unavailable" })
  findOne(@Param("code") code: string) {
    return this.geoService.getRegionByCode(code);
  }
}
