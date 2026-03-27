import { Controller, Get, Param } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";
import { ApiErrorResponse } from "../../models/api-error.model";
import {
  DepartementResponse,
  DepartementsResponse
} from "./models/departement.model";
import { DepartementsService } from "./departements.service";

@ApiTags("departements")
@Controller("departements")
export class DepartementsController {
  constructor(private readonly departementsService: DepartementsService) {}

  @ApiOperation({ summary: "List departements available in the Mongo dataset" })
  @ApiOkResponse({ type: DepartementsResponse, description: "Departement list with computed city counts" })
  @Get()
  findAll() {
    return this.departementsService.findAll();
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
