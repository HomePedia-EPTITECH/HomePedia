import { Module } from "@nestjs/common";
import { MongoModule } from "../../db/mongo.module";
import { CitiesController } from "./cities.controller";
import { CitiesRepository } from "./cities.repository";
import { CitiesService } from "./cities.service";

@Module({
  imports: [MongoModule],
  controllers: [CitiesController],
  providers: [CitiesService, CitiesRepository]
})
export class CitiesModule {}
