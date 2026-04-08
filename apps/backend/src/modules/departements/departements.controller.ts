import { Controller, Get, Param, Query } from "@nestjs/common";
import { GetCitiesQueryDto } from "../cities/dto/get-cities-query.dto";
import { DepartementsService } from "./departements.service";

@Controller("departements")
export class DepartementsController {
  constructor(private readonly departementsService: DepartementsService) {}

  @Get()
  findAll() {
    return this.departementsService.findAll();
  }

  @Get(":code/cities")
  findCities(@Param("code") code: string, @Query() query: GetCitiesQueryDto) {
    return this.departementsService.findCities(code, query);
  }

  @Get(":code")
  findOne(@Param("code") code: string) {
    return this.departementsService.findOne(code);
  }
}
