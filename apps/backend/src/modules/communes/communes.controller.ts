import { Body, Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags
} from "@nestjs/swagger";
import { GeoService } from "../geo/geo.service";
import { GetCitiesQueryDto } from "../geo/dto/get-cities-query.dto";
import {
  DepartementResponseDto,
  DepartementsResponseDto
} from "../geo/dto/departement-response.dto";
import { CitiesResponseDto } from "../geo/dto/city-response.dto";
import { RegionResponseDto, RegionsResponseDto } from "../geo/dto/region-response.dto";
import { CommuneDetailResponseDto } from "./dto/commune-detail-response.dto";
import { CommuneListResponseDto } from "./dto/commune-list-response.dto";
import {
  CommuneSearchQueryDto,
  CommuneSearchResponseDto
} from "./dto/commune-search-response.dto";
import { CommuneRankRequestDto } from "./dto/communes-rank-request.dto";
import { CommuneRankResponseDto } from "./dto/communes-rank-response.dto";
import { NationalStatsResponseDto } from "./dto/national-stats-response.dto";
import { GetCommunesQueryDto } from "./dto/communes-list-query.dto";
import { CommunesService } from "./communes.service";

@ApiTags("communes")
@Controller()
export class CommunesController {
  constructor(private readonly communesService: CommunesService) {}

  @Get("communes")
  @ApiOperation({ summary: "List communes" })
  @ApiQuery({ type: GetCommunesQueryDto })
  @ApiOkResponse({ type: CommuneListResponseDto })
  @ApiBadRequestResponse({ description: "Invalid query parameters" })
  @ApiServiceUnavailableResponse({ description: "Commune data source unavailable" })
  findAll(@Query() query: GetCommunesQueryDto) {
    return this.communesService.findAll(query);
  }

  @Post("communes/rank")
  @HttpCode(200)
  @ApiOperation({ summary: "Rank communes according to user preferences" })
  @ApiBody({ type: CommuneRankRequestDto })
  @ApiOkResponse({ type: CommuneRankResponseDto })
  @ApiBadRequestResponse({ description: "Invalid body parameters" })
  @ApiServiceUnavailableResponse({ description: "Commune data source unavailable" })
  rank(@Body() body: CommuneRankRequestDto) {
    return this.communesService.rank(body);
  }

  @Get("communes/search")
  @ApiOperation({ summary: "Search communes" })
  @ApiQuery({ type: CommuneSearchQueryDto })
  @ApiOkResponse({ type: CommuneSearchResponseDto })
  @ApiBadRequestResponse({ description: "Invalid query parameters" })
  @ApiServiceUnavailableResponse({ description: "Commune data source unavailable" })
  search(@Query() query: CommuneSearchQueryDto) {
    return this.communesService.search(query.q, query.limit ?? 8);
  }

  @Get("communes/:id")
  @ApiOperation({ summary: "Get commune detail" })
  @ApiParam({ name: "id", example: "75056" })
  @ApiOkResponse({ type: CommuneDetailResponseDto })
  @ApiBadRequestResponse({ description: "Invalid commune id" })
  @ApiServiceUnavailableResponse({ description: "Commune data source unavailable" })
  findOne(@Param("id") id: string) {
    return this.communesService.findOne(id);
  }

  @Get("stats/national")
  @ApiOperation({ summary: "Get national commune averages" })
  @ApiOkResponse({ type: NationalStatsResponseDto })
  @ApiServiceUnavailableResponse({ description: "Commune data source unavailable" })
  getNationalStats() {
    return this.communesService.getNationalStats();
  }
}

@ApiTags("geo")
@Controller()
export class GeoPublicController {
  constructor(private readonly geoService: GeoService) {}

  @Get("regions")
  @ApiOperation({ summary: "List regions" })
  @ApiOkResponse({ type: RegionsResponseDto })
  @ApiServiceUnavailableResponse({ description: "Regions data source unavailable" })
  findRegions() {
    return this.geoService.getRegions();
  }

  @Get("regions/:code")
  @ApiOperation({ summary: "Get region" })
  @ApiParam({ name: "code", example: "11" })
  @ApiOkResponse({ type: RegionResponseDto })
  @ApiServiceUnavailableResponse({ description: "Regions data source unavailable" })
  findRegion(@Param("code") code: string) {
    return this.geoService.getRegionByCode(code);
  }

  @Get("regions/:code/departements")
  @ApiOperation({ summary: "List region departements" })
  @ApiParam({ name: "code", example: "11" })
  @ApiOkResponse({ type: DepartementsResponseDto })
  @ApiServiceUnavailableResponse({ description: "Regions data source unavailable" })
  findRegionDepartements(@Param("code") code: string) {
    return this.geoService.getRegionDepartements(code);
  }

  @Get("departements")
  @ApiOperation({ summary: "List departements" })
  @ApiQuery({ name: "region", required: false, example: "11" })
  @ApiOkResponse({ type: DepartementsResponseDto })
  @ApiServiceUnavailableResponse({ description: "Departements data source unavailable" })
  async findDepartements(@Query("region") region?: string) {
    if (region) {
      return this.geoService.getRegionDepartements(region);
    }

    return this.geoService.getDepartements();
  }

  @Get("departements/:code")
  @ApiOperation({ summary: "Get departement" })
  @ApiParam({ name: "code", example: "75" })
  @ApiOkResponse({ type: DepartementResponseDto })
  @ApiServiceUnavailableResponse({ description: "Departements data source unavailable" })
  findDepartement(@Param("code") code: string) {
    return this.geoService.getDepartementByCode(code);
  }

  @Get("departements/:code/cities")
  @ApiOperation({ summary: "List departement cities" })
  @ApiParam({ name: "code", example: "75" })
  @ApiQuery({ type: GetCitiesQueryDto })
  @ApiOkResponse({ type: CitiesResponseDto })
  @ApiServiceUnavailableResponse({ description: "Departements data source unavailable" })
  findDepartementCities(@Param("code") code: string, @Query() query: GetCitiesQueryDto) {
    return this.geoService.getDepartementCities(code, query);
  }
}
