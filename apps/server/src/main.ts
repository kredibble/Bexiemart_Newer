import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { rawBodyParser } from "./middleware/raw-body.middleware";
import { GlobalExceptionFilter } from "./filters/global-exception.filter";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ["log", "error", "warn", "debug", "verbose"],
  });

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",") || false,
    credentials: true,
  });

  const uploadDir = join(process.cwd(), "uploads");
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
  app.useStaticAssets(uploadDir, { prefix: "/uploads/" });

  app.use(rawBodyParser("/webhooks/paystack"));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.setGlobalPrefix("api");

  const config = new DocumentBuilder()
    .setTitle("BexieMart API")
    .setDescription("Campus marketplace API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`BexieMart API running on port ${port}`);
}
bootstrap();
