import { Controller, Get, Param, Query } from "@nestjs/common";
import { GetCitiesQueryDto } from "./dto/get-cities-query.dto";
import { CitiesService } from "./cities.service";

@Controller("cities")
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get()
  findAll(@Query() query: GetCitiesQueryDto) {
    return this.citiesService.getCities(query);
  }

  @Get(":code/details")
  findDetails(@Param("code") code: string) {
    return this.citiesService.getCityDetailsByCode(code);
  }

  @Get(":code")
  findOne(@Param("code") code: string) {
    return this.citiesService.getCityByCode(code);
  }
}
