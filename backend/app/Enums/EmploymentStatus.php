<?php

namespace App\Enums;

enum EmploymentStatus: string
{
    case Permanent = 'permanent';
    case Honorary = 'honorary';
    case Contract = 'contract';
}
