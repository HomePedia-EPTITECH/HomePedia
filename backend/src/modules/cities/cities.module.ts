import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module";
import { CitiesController } from "./cities.controller";
import { CitiesRepository } from "./cities.repository";
import { CitiesService } from "./cities.service";

@Module({
  imports: [DbModule],
  controllers: [CitiesController],
  providers: [CitiesService, CitiesRepository]
})
export class CitiesModule {}

