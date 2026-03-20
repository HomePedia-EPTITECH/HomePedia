import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { GetCitiesQueryDto } from "./dto/get-cities-query.dto";
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
  @Get()
  findAll(@Query() query: GetCitiesQueryDto) {
    return this.citiesService.getCities(query);
  }

  @ApiOperation({ summary: "Get a city by INSEE code" })
  @ApiParam({ name: "code", type: String })
  @Get(":code")
  findOne(@Param("code") code: string) {
    return this.citiesService.getCityByCode(code);
  }
}
